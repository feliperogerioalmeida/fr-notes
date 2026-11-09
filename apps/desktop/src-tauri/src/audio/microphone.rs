use std::sync::mpsc;
use std::thread::JoinHandle;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{FromSample, SampleFormat, SizedSample, StreamConfig};
use tokio::sync::mpsc::UnboundedSender;

use super::pcm::downmix_to_mono;
use super::ErrorReporter;

pub struct MicrophoneCapture {
    stop_tx: mpsc::Sender<()>,
    thread: Option<JoinHandle<()>>,
}

impl MicrophoneCapture {
    pub fn stop(mut self) {
        let _ = self.stop_tx.send(());
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

pub fn start_microphone(
    audio_tx: UnboundedSender<Vec<f32>>,
    report_error: ErrorReporter,
) -> Result<(MicrophoneCapture, u32), String> {
    let (ready_tx, ready_rx) = mpsc::channel::<Result<u32, String>>();
    let (stop_tx, stop_rx) = mpsc::channel::<()>();
    let thread = std::thread::Builder::new()
        .name("fr-notes-microphone".into())
        .spawn(move || run_microphone_thread(audio_tx, report_error, ready_tx, stop_rx))
        .map_err(|error| error.to_string())?;
    let sample_rate = ready_rx
        .recv()
        .map_err(|_| "microphone_thread_failed".to_string())??;
    let capture = MicrophoneCapture {
        stop_tx,
        thread: Some(thread),
    };
    Ok((capture, sample_rate))
}

fn run_microphone_thread(
    audio_tx: UnboundedSender<Vec<f32>>,
    report_error: ErrorReporter,
    ready_tx: mpsc::Sender<Result<u32, String>>,
    stop_rx: mpsc::Receiver<()>,
) {
    let stream = match open_input_stream(audio_tx, report_error) {
        Ok((stream, sample_rate)) => {
            let _ = ready_tx.send(Ok(sample_rate));
            stream
        }
        Err(error) => {
            let _ = ready_tx.send(Err(error));
            return;
        }
    };
    let _ = stop_rx.recv();
    let _ = stream.pause();
    drop(stream);
}

fn open_input_stream(
    audio_tx: UnboundedSender<Vec<f32>>,
    report_error: ErrorReporter,
) -> Result<(cpal::Stream, u32), String> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| "no_input_device".to_string())?;
    let supported = device
        .default_input_config()
        .map_err(|error| error.to_string())?;
    let config = supported.config();
    let sample_rate = config.sample_rate;
    let stream = build_for_format(
        &device,
        supported.sample_format(),
        config,
        audio_tx,
        report_error,
    )?;
    stream.play().map_err(|error| error.to_string())?;
    Ok((stream, sample_rate))
}

fn build_for_format(
    device: &cpal::Device,
    format: SampleFormat,
    config: StreamConfig,
    audio_tx: UnboundedSender<Vec<f32>>,
    report_error: ErrorReporter,
) -> Result<cpal::Stream, String> {
    match format {
        SampleFormat::F32 => build_stream::<f32>(device, config, audio_tx, report_error),
        SampleFormat::I16 => build_stream::<i16>(device, config, audio_tx, report_error),
        SampleFormat::I32 => build_stream::<i32>(device, config, audio_tx, report_error),
        SampleFormat::U16 => build_stream::<u16>(device, config, audio_tx, report_error),
        other => Err(format!("unsupported_sample_format:{other:?}")),
    }
}

fn build_stream<T>(
    device: &cpal::Device,
    config: StreamConfig,
    audio_tx: UnboundedSender<Vec<f32>>,
    report_error: ErrorReporter,
) -> Result<cpal::Stream, String>
where
    T: SizedSample,
    f32: FromSample<T>,
{
    let channels = usize::from(config.channels);
    device
        .build_input_stream::<T, _, _>(
            config,
            move |data: &[T], _| {
                let samples: Vec<f32> = data
                    .iter()
                    .map(|sample| sample.to_sample::<f32>())
                    .collect();
                let _ = audio_tx.send(downmix_to_mono(&samples, channels));
            },
            move |error| report_error(error.to_string()),
            None,
        )
        .map_err(|error| error.to_string())
}
