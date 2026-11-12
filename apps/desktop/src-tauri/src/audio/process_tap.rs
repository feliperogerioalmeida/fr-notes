use std::ffi::{c_char, c_void, CStr};
use std::ptr::NonNull;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use block2::RcBlock;
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2::{AllocAnyThread, Message};
use objc2_core_audio::{
    kAudioAggregateDeviceIsPrivateKey, kAudioAggregateDeviceIsStackedKey,
    kAudioAggregateDeviceMainSubDeviceKey, kAudioAggregateDeviceNameKey,
    kAudioAggregateDeviceSubDeviceListKey, kAudioAggregateDeviceTapAutoStartKey,
    kAudioAggregateDeviceTapListKey, kAudioAggregateDeviceUIDKey, kAudioDevicePropertyDeviceUID,
    kAudioDevicePropertyNominalSampleRate,
    kAudioHardwarePropertyDefaultOutputDevice, kAudioHardwarePropertyTranslatePIDToProcessObject,
    kAudioSubDeviceUIDKey, kAudioSubTapDriftCompensationKey, kAudioSubTapUIDKey,
    kAudioTapPropertyFormat, AudioDeviceCreateIOProcIDWithBlock, AudioDeviceDestroyIOProcID,
    AudioDeviceIOProcID, AudioDeviceStart, AudioDeviceStop, AudioHardwareCreateAggregateDevice,
    AudioHardwareDestroyAggregateDevice, AudioObjectID, CATapDescription,
};
use objc2_core_audio_types::{
    kAudioFormatFlagIsFloat, kAudioFormatLinearPCM, AudioBufferList, AudioStreamBasicDescription,
    AudioTimeStamp,
};
use objc2_core_foundation::CFDictionary;
use objc2_foundation::{NSArray, NSDictionary, NSNumber, NSString, NSUUID};
use tokio::sync::mpsc::UnboundedSender;

use super::pcm::{average_channels, downmix_to_mono, AdaptiveResampler};
use crate::core_audio::{read_qualified, read_string, read_value, status_error, SYSTEM_OBJECT};
use crate::tcc;

const CREATE_TAP_SYMBOL: &CStr = c"AudioHardwareCreateProcessTap";
const DESTROY_TAP_SYMBOL: &CStr = c"AudioHardwareDestroyProcessTap";
const TAP_NAME: &str = "FR Notes System Audio";
const AGGREGATE_NAME: &str = "FR Notes Tap";
const AGGREGATE_UID_PREFIX: &str = "dev.feliperogerio.notes.tap.";
const FLOAT32_BITS: u32 = 32;
/// The tap is always delivered at this rate, whatever the output device runs at.
const OUTPUT_SAMPLE_RATE: u32 = 48_000;
const RATE_POLL_INTERVAL: Duration = Duration::from_millis(500);

type CreateTapFn = unsafe extern "C" fn(*const CATapDescription, *mut AudioObjectID) -> i32;
type DestroyTapFn = unsafe extern "C" fn(AudioObjectID) -> i32;
type ObjectEntry = (Retained<NSString>, Retained<AnyObject>);

#[derive(Debug)]
pub enum TapError {
    Unavailable,
    PermissionDenied,
    Failed(String),
}

#[derive(Clone, Copy)]
struct TapFunctions {
    create: CreateTapFn,
    destroy: DestroyTapFn,
}

pub struct ProcessTapCapture {
    destroy_tap: DestroyTapFn,
    tap_id: AudioObjectID,
    aggregate_id: Option<AudioObjectID>,
    proc_id: AudioDeviceIOProcID,
    started: bool,
    rate_watch: Option<Arc<AtomicBool>>,
}

impl ProcessTapCapture {
    pub fn stop(self) {
        drop(self);
    }
}

impl Drop for ProcessTapCapture {
    fn drop(&mut self) {
        if let Some(running) = self.rate_watch.take() {
            running.store(false, Ordering::Relaxed);
        }
        let Some(aggregate_id) = self.aggregate_id.take() else {
            unsafe { (self.destroy_tap)(self.tap_id) };
            return;
        };
        unsafe {
            if self.started {
                AudioDeviceStop(aggregate_id, self.proc_id);
            }
            if self.proc_id.is_some() {
                AudioDeviceDestroyIOProcID(aggregate_id, self.proc_id);
            }
            AudioHardwareDestroyAggregateDevice(aggregate_id);
            (self.destroy_tap)(self.tap_id);
        }
    }
}

fn resolve_symbol(name: &CStr) -> *mut c_void {
    unsafe { libc::dlsym(libc::RTLD_DEFAULT, name.as_ptr() as *const c_char) }
}

fn tap_functions() -> Option<TapFunctions> {
    let create = resolve_symbol(CREATE_TAP_SYMBOL);
    let destroy = resolve_symbol(DESTROY_TAP_SYMBOL);
    if create.is_null() || destroy.is_null() {
        return None;
    }
    Some(TapFunctions {
        create: unsafe { std::mem::transmute::<*mut c_void, CreateTapFn>(create) },
        destroy: unsafe { std::mem::transmute::<*mut c_void, DestroyTapFn>(destroy) },
    })
}

pub fn start_process_tap(
    audio_tx: UnboundedSender<Vec<f32>>,
) -> Result<(ProcessTapCapture, u32), TapError> {
    let functions = tap_functions().ok_or(TapError::Unavailable)?;
    if tcc::is_audio_capture_denied() {
        return Err(TapError::PermissionDenied);
    }
    let description = build_tap_description();
    let mut capture = create_tap(functions, &description)?;
    let format = read_tap_format(capture.tap_id)?;
    let tap_uid = unsafe { description.UUID() }.UUIDString().to_string();
    capture.aggregate_id = Some(create_aggregate_device(&tap_uid)?);
    let aggregate_id = capture.aggregate_id.unwrap_or_default();
    // The aggregate runs at its main sub-device's rate, which can differ from the tap
    // format (a headset in call mode runs at 16 kHz) and can change while recording.
    let input_rate = Arc::new(AtomicU32::new(
        read_nominal_rate(aggregate_id).unwrap_or(format.mSampleRate as u32),
    ));
    capture.rate_watch = Some(watch_nominal_rate(aggregate_id, input_rate.clone()));
    capture.proc_id = register_io_block(
        aggregate_id,
        format.mChannelsPerFrame,
        input_rate,
        audio_tx,
    )?;
    let status = unsafe { AudioDeviceStart(aggregate_id, capture.proc_id) };
    if status != 0 {
        return Err(TapError::Failed(status_error(
            "aggregate_device_start",
            status,
        )));
    }
    capture.started = true;
    Ok((capture, OUTPUT_SAMPLE_RATE))
}

fn read_nominal_rate(device: AudioObjectID) -> Option<u32> {
    let rate: f64 = read_value(device, kAudioDevicePropertyNominalSampleRate).ok()?;
    (rate > 0.0).then(|| rate.round() as u32)
}

fn watch_nominal_rate(device: AudioObjectID, rate: Arc<AtomicU32>) -> Arc<AtomicBool> {
    let running = Arc::new(AtomicBool::new(true));
    let flag = running.clone();
    std::thread::spawn(move || {
        while flag.load(Ordering::Relaxed) {
            if let Some(value) = read_nominal_rate(device) {
                rate.store(value, Ordering::Relaxed);
            }
            std::thread::sleep(RATE_POLL_INTERVAL);
        }
    });
    running
}

fn own_process_object() -> Option<AudioObjectID> {
    let pid = std::process::id() as i32;
    let object: AudioObjectID = read_qualified(
        SYSTEM_OBJECT,
        kAudioHardwarePropertyTranslatePIDToProcessObject,
        Some(&pid),
    )
    .ok()?;
    (object != 0).then_some(object)
}

fn build_tap_description() -> Retained<CATapDescription> {
    let exclusions: Vec<Retained<NSNumber>> = own_process_object()
        .map(NSNumber::new_u32)
        .into_iter()
        .collect();
    let processes = NSArray::from_retained_slice(&exclusions);
    let description = unsafe {
        CATapDescription::initMonoGlobalTapButExcludeProcesses(
            CATapDescription::alloc(),
            &processes,
        )
    };
    unsafe {
        description.setUUID(&NSUUID::new());
        description.setName(&NSString::from_str(TAP_NAME));
        description.setPrivate(true);
    }
    description
}

fn create_tap(
    functions: TapFunctions,
    description: &CATapDescription,
) -> Result<ProcessTapCapture, TapError> {
    let mut tap_id: AudioObjectID = 0;
    let status = unsafe { (functions.create)(description as *const CATapDescription, &mut tap_id) };
    if status != 0 || tap_id == 0 {
        return Err(TapError::Failed(status_error("process_tap_create", status)));
    }
    Ok(ProcessTapCapture {
        destroy_tap: functions.destroy,
        tap_id,
        aggregate_id: None,
        proc_id: None,
        started: false,
        rate_watch: None,
    })
}

fn read_tap_format(tap_id: AudioObjectID) -> Result<AudioStreamBasicDescription, TapError> {
    let format: AudioStreamBasicDescription = read_value(tap_id, kAudioTapPropertyFormat)
        .map_err(|status| TapError::Failed(status_error("tap_format", status)))?;
    let is_float32 = format.mFormatID == kAudioFormatLinearPCM
        && format.mFormatFlags & kAudioFormatFlagIsFloat != 0
        && format.mBitsPerChannel == FLOAT32_BITS;
    if !is_float32 || format.mSampleRate <= 0.0 {
        return Err(TapError::Failed("unsupported_tap_format".into()));
    }
    Ok(format)
}

fn default_output_uid() -> Result<String, TapError> {
    let device: AudioObjectID =
        read_value(SYSTEM_OBJECT, kAudioHardwarePropertyDefaultOutputDevice)
            .map_err(|status| TapError::Failed(status_error("default_output_device", status)))?;
    read_string(device, kAudioDevicePropertyDeviceUID)
        .map_err(|status| TapError::Failed(status_error("output_device_uid", status)))
}

fn key(name: &CStr) -> Retained<NSString> {
    NSString::from_str(name.to_str().unwrap_or_default())
}

fn as_object<T: Message>(value: Retained<T>) -> Retained<AnyObject> {
    unsafe { Retained::cast_unchecked(value) }
}

fn dictionary(entries: Vec<ObjectEntry>) -> Retained<NSDictionary<NSString, AnyObject>> {
    let keys: Vec<&NSString> = entries.iter().map(|(key, _)| &**key).collect();
    let values: Vec<Retained<AnyObject>> = entries.iter().map(|(_, value)| value.clone()).collect();
    NSDictionary::from_retained_objects(&keys, &values)
}

fn single_item_list(entries: Vec<ObjectEntry>) -> Retained<AnyObject> {
    as_object(NSArray::from_retained_slice(&[dictionary(entries)]))
}

fn aggregate_description(
    tap_uid: &str,
    output_uid: &str,
) -> Retained<NSDictionary<NSString, AnyObject>> {
    let aggregate_uid = format!("{AGGREGATE_UID_PREFIX}{}", NSUUID::new().UUIDString());
    dictionary(vec![
        (
            key(kAudioAggregateDeviceNameKey),
            as_object(NSString::from_str(AGGREGATE_NAME)),
        ),
        (
            key(kAudioAggregateDeviceUIDKey),
            as_object(NSString::from_str(&aggregate_uid)),
        ),
        (
            key(kAudioAggregateDeviceMainSubDeviceKey),
            as_object(NSString::from_str(output_uid)),
        ),
        (
            key(kAudioAggregateDeviceIsPrivateKey),
            as_object(NSNumber::new_bool(true)),
        ),
        (
            key(kAudioAggregateDeviceIsStackedKey),
            as_object(NSNumber::new_bool(false)),
        ),
        (
            key(kAudioAggregateDeviceTapAutoStartKey),
            as_object(NSNumber::new_bool(true)),
        ),
        (
            key(kAudioAggregateDeviceSubDeviceListKey),
            single_item_list(vec![(
                key(kAudioSubDeviceUIDKey),
                as_object(NSString::from_str(output_uid)),
            )]),
        ),
        (
            key(kAudioAggregateDeviceTapListKey),
            single_item_list(vec![
                (
                    key(kAudioSubTapUIDKey),
                    as_object(NSString::from_str(tap_uid)),
                ),
                (
                    key(kAudioSubTapDriftCompensationKey),
                    as_object(NSNumber::new_bool(true)),
                ),
            ]),
        ),
    ])
}

fn create_aggregate_device(tap_uid: &str) -> Result<AudioObjectID, TapError> {
    let output_uid = default_output_uid()?;
    let description = aggregate_description(tap_uid, &output_uid);
    let description_ref = unsafe { &*(Retained::as_ptr(&description) as *const CFDictionary) };
    let mut aggregate_id: AudioObjectID = 0;
    let status = unsafe {
        AudioHardwareCreateAggregateDevice(description_ref, NonNull::from(&mut aggregate_id))
    };
    if status != 0 || aggregate_id == 0 {
        return Err(TapError::Failed(status_error(
            "aggregate_device_create",
            status,
        )));
    }
    Ok(aggregate_id)
}

unsafe fn read_tap_samples(list: NonNull<AudioBufferList>, tap_channels: u32) -> Option<Vec<f32>> {
    let list = list.as_ref();
    let count = list.mNumberBuffers as usize;
    if count == 0 {
        return None;
    }
    let buffers = std::slice::from_raw_parts(list.mBuffers.as_ptr(), count);
    let to_samples = |buffer: &objc2_core_audio_types::AudioBuffer| -> Vec<f32> {
        if buffer.mData.is_null() {
            return Vec::new();
        }
        std::slice::from_raw_parts(
            buffer.mData as *const f32,
            buffer.mDataByteSize as usize / 4,
        )
        .to_vec()
    };
    let is_planar = tap_channels > 1
        && count == tap_channels as usize
        && buffers.iter().all(|b| b.mNumberChannels == 1);
    if is_planar {
        let channels: Vec<Vec<f32>> = buffers.iter().map(to_samples).collect();
        return Some(average_channels(&channels));
    }
    let buffer = buffers.last()?;
    let samples = to_samples(buffer);
    if samples.is_empty() {
        return None;
    }
    Some(downmix_to_mono(
        &samples,
        buffer.mNumberChannels.max(1) as usize,
    ))
}

fn register_io_block(
    aggregate_id: AudioObjectID,
    tap_channels: u32,
    input_rate: Arc<AtomicU32>,
    audio_tx: UnboundedSender<Vec<f32>>,
) -> Result<AudioDeviceIOProcID, TapError> {
    let resampler = Mutex::new(AdaptiveResampler::new(
        input_rate.load(Ordering::Relaxed),
        OUTPUT_SAMPLE_RATE,
    ));
    let block = RcBlock::new(
        move |_now: NonNull<AudioTimeStamp>,
              input: NonNull<AudioBufferList>,
              _input_time: NonNull<AudioTimeStamp>,
              _output: NonNull<AudioBufferList>,
              _output_time: NonNull<AudioTimeStamp>| {
            let Some(samples) = (unsafe { read_tap_samples(input, tap_channels) }) else {
                return;
            };
            let Ok(mut resampler) = resampler.lock() else {
                return;
            };
            let resampled = resampler.process(input_rate.load(Ordering::Relaxed), &samples);
            let _ = audio_tx.send(resampled);
        },
    );
    let mut proc_id: AudioDeviceIOProcID = None;
    let status = unsafe {
        AudioDeviceCreateIOProcIDWithBlock(
            NonNull::from(&mut proc_id),
            aggregate_id,
            None,
            RcBlock::as_ptr(&block),
        )
    };
    if status != 0 || proc_id.is_none() {
        return Err(TapError::Failed(status_error("io_proc_create", status)));
    }
    Ok(proc_id)
}
