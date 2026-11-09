use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};
use tokio::sync::{watch, Mutex};
use tokio::task::JoinHandle;

use crate::audio::echo::{start_echo_canceller, EchoInputSender, EchoRates, AEC_SAMPLE_RATE};
use crate::audio::microphone::{start_microphone, MicrophoneCapture};
use crate::audio::ErrorReporter;
use crate::events::{
    emit_recording_error, emit_recording_state, AudioSource, RecordingLevelPayload,
    RECORDING_LEVEL_EVENT,
};
use crate::secrets::{read_secret, DEEPGRAM_API_KEY};
use crate::transcription::deepgram::DeepgramConfig;
use crate::transcription::stream::{now_epoch_ms, run_source_stream, SourceStream};

const LEVEL_EMIT_INTERVAL: Duration = Duration::from_millis(100);
const STREAM_SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(6);
pub const MISSING_DEEPGRAM_KEY_ERROR: &str = "missing_deepgram_api_key";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartRecordingArgs {
    pub note_id: String,
    pub language: String,
    #[serde(default)]
    pub keyterms: Vec<String>,
    #[serde(default = "default_enabled")]
    pub capture_system_audio: bool,
    #[serde(default = "default_enabled")]
    pub echo_cancellation: bool,
}

fn default_enabled() -> bool {
    true
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStarted {
    pub session_id: String,
    pub started_at_ms: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStatus {
    pub is_recording: bool,
    pub note_id: Option<String>,
    pub started_at_ms: Option<u64>,
}

#[cfg(target_os = "macos")]
type SystemCapture = crate::audio::system_audio::SystemAudioCapture;
#[cfg(not(target_os = "macos"))]
type SystemCapture = ();

struct ActiveSession {
    note_id: String,
    started_at_ms: u64,
    stop_tx: watch::Sender<bool>,
    microphone: MicrophoneCapture,
    system: Option<SystemCapture>,
    stream_tasks: Vec<JoinHandle<()>>,
    level_task: JoinHandle<()>,
}

struct SessionLevels {
    microphone: Arc<AtomicU32>,
    system: Arc<AtomicU32>,
}

#[derive(Default)]
pub struct RecordingManager {
    active: Mutex<Option<ActiveSession>>,
}

impl RecordingManager {
    pub async fn start(
        &self,
        app: &AppHandle,
        args: StartRecordingArgs,
    ) -> Result<RecordingStarted, String> {
        let mut active = self.active.lock().await;
        if active.is_some() {
            return Err("recording_already_active".into());
        }
        let api_key =
            read_secret(DEEPGRAM_API_KEY)?.ok_or_else(|| MISSING_DEEPGRAM_KEY_ERROR.to_string())?;
        let session = start_session(app, args, api_key)?;
        let started = RecordingStarted {
            session_id: uuid::Uuid::new_v4().to_string(),
            started_at_ms: session.started_at_ms,
        };
        emit_recording_state(app, "recording", Some(session.note_id.clone()));
        *active = Some(session);
        Ok(started)
    }

    pub async fn stop(&self, app: &AppHandle) -> Result<(), String> {
        let Some(session) = self.active.lock().await.take() else {
            return Ok(());
        };
        let note_id = session.note_id.clone();
        shutdown_session(session).await;
        emit_recording_state(app, "stopped", Some(note_id));
        Ok(())
    }

    pub async fn status(&self) -> RecordingStatus {
        let active = self.active.lock().await;
        RecordingStatus {
            is_recording: active.is_some(),
            note_id: active.as_ref().map(|session| session.note_id.clone()),
            started_at_ms: active.as_ref().map(|session| session.started_at_ms),
        }
    }
}

struct RoutedSource {
    receiver: UnboundedReceiver<Vec<f32>>,
    sample_rate: u32,
}

struct AudioRouting {
    microphone: RoutedSource,
    system: Option<RoutedSource>,
    tasks: Vec<JoinHandle<()>>,
}

fn start_session(
    app: &AppHandle,
    args: StartRecordingArgs,
    api_key: String,
) -> Result<ActiveSession, String> {
    let (stop_tx, stop_rx) = watch::channel(false);
    let levels = SessionLevels {
        microphone: Arc::new(AtomicU32::new(0)),
        system: Arc::new(AtomicU32::new(0)),
    };
    let base_config = DeepgramConfig {
        api_key,
        language: args.language.clone(),
        keyterms: args.keyterms.clone(),
        sample_rate: 0,
        diarize: false,
    };
    let (microphone, microphone_source) = start_microphone_capture(app)?;
    let (system, system_source) = match start_optional_system_capture(app, &args) {
        Some((capture, source)) => (Some(capture), Some(source)),
        None => (None, None),
    };
    let routing = route_audio(
        app,
        args.echo_cancellation,
        microphone_source,
        system_source,
    );
    let mut stream_tasks = routing.tasks;
    stream_tasks.push(spawn_stream(
        app,
        &args.note_id,
        AudioSource::Microphone,
        &base_config,
        levels.microphone.clone(),
        routing.microphone,
        stop_rx.clone(),
    ));
    if let Some(source) = routing.system {
        stream_tasks.push(spawn_stream(
            app,
            &args.note_id,
            AudioSource::System,
            &base_config,
            levels.system.clone(),
            source,
            stop_rx,
        ));
    }
    Ok(ActiveSession {
        note_id: args.note_id,
        started_at_ms: now_epoch_ms(),
        stop_tx,
        microphone,
        system,
        stream_tasks,
        level_task: spawn_level_emitter(app.clone(), levels),
    })
}

fn spawn_stream(
    app: &AppHandle,
    note_id: &str,
    source: AudioSource,
    base_config: &DeepgramConfig,
    level: Arc<AtomicU32>,
    routed: RoutedSource,
    stop_rx: watch::Receiver<bool>,
) -> JoinHandle<()> {
    let stream = SourceStream {
        app: app.clone(),
        note_id: note_id.to_string(),
        source,
        config: DeepgramConfig {
            sample_rate: routed.sample_rate,
            diarize: matches!(source, AudioSource::System),
            ..base_config.clone()
        },
        level,
    };
    tokio::spawn(run_source_stream(stream, routed.receiver, stop_rx))
}

fn start_microphone_capture(app: &AppHandle) -> Result<(MicrophoneCapture, RoutedSource), String> {
    let (audio_tx, receiver) = unbounded_channel();
    let error_app = app.clone();
    let report_error: ErrorReporter =
        Arc::new(move |message| emit_recording_error(&error_app, "microphone", message));
    let (capture, sample_rate) = start_microphone(audio_tx, report_error)?;
    Ok((
        capture,
        RoutedSource {
            receiver,
            sample_rate,
        },
    ))
}

#[cfg(target_os = "macos")]
fn start_optional_system_capture(
    app: &AppHandle,
    args: &StartRecordingArgs,
) -> Option<(SystemCapture, RoutedSource)> {
    if !args.capture_system_audio {
        return None;
    }
    let (audio_tx, receiver) = unbounded_channel();
    match crate::audio::system_audio::start_system_audio(audio_tx) {
        Ok((capture, sample_rate)) => Some((
            capture,
            RoutedSource {
                receiver,
                sample_rate,
            },
        )),
        Err(error) => {
            emit_recording_error(app, "system", error);
            None
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn start_optional_system_capture(
    app: &AppHandle,
    args: &StartRecordingArgs,
) -> Option<(SystemCapture, RoutedSource)> {
    if args.capture_system_audio {
        emit_recording_error(app, "system", "system_audio_unsupported_platform");
    }
    None
}

fn route_audio(
    app: &AppHandle,
    echo_cancellation: bool,
    microphone: RoutedSource,
    system: Option<RoutedSource>,
) -> AudioRouting {
    let system = match system {
        Some(system) if echo_cancellation => system,
        other => {
            return AudioRouting {
                microphone,
                system: other,
                tasks: Vec::new(),
            }
        }
    };
    let (clean_tx, clean_rx) = unbounded_channel();
    let rates = EchoRates {
        capture: microphone.sample_rate,
        reference: system.sample_rate,
    };
    let canceller = match start_echo_canceller(rates, clean_tx) {
        Ok(canceller) => canceller,
        Err(error) => {
            emit_recording_error(app, "microphone", error);
            return AudioRouting {
                microphone,
                system: Some(system),
                tasks: Vec::new(),
            };
        }
    };
    let (system_tx, system_rx) = unbounded_channel();
    let tasks = vec![
        tokio::spawn(forward_capture(microphone.receiver, canceller.clone())),
        tokio::spawn(forward_reference(system.receiver, canceller, system_tx)),
    ];
    AudioRouting {
        microphone: RoutedSource {
            receiver: clean_rx,
            sample_rate: AEC_SAMPLE_RATE,
        },
        system: Some(RoutedSource {
            receiver: system_rx,
            sample_rate: system.sample_rate,
        }),
        tasks,
    }
}

async fn forward_capture(mut receiver: UnboundedReceiver<Vec<f32>>, canceller: EchoInputSender) {
    while let Some(chunk) = receiver.recv().await {
        if !canceller.send_capture(chunk) {
            break;
        }
    }
}

async fn forward_reference(
    mut receiver: UnboundedReceiver<Vec<f32>>,
    canceller: EchoInputSender,
    system_tx: UnboundedSender<Vec<f32>>,
) {
    while let Some(chunk) = receiver.recv().await {
        canceller.send_reference(chunk.clone());
        if system_tx.send(chunk).is_err() {
            break;
        }
    }
}

fn spawn_level_emitter(app: AppHandle, levels: SessionLevels) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(LEVEL_EMIT_INTERVAL);
        loop {
            interval.tick().await;
            let payload = RecordingLevelPayload {
                microphone: f32::from_bits(levels.microphone.swap(0, Ordering::Relaxed)),
                system: f32::from_bits(levels.system.swap(0, Ordering::Relaxed)),
            };
            let _ = app.emit(RECORDING_LEVEL_EVENT, payload);
        }
    })
}

async fn shutdown_session(session: ActiveSession) {
    let _ = session.stop_tx.send(true);
    let microphone = session.microphone;
    let system = session.system;
    let _ = tokio::task::spawn_blocking(move || {
        microphone.stop();
        stop_system_capture(system);
    })
    .await;
    for task in session.stream_tasks {
        let abort_handle = task.abort_handle();
        if tokio::time::timeout(STREAM_SHUTDOWN_TIMEOUT, task)
            .await
            .is_err()
        {
            abort_handle.abort();
        }
    }
    session.level_task.abort();
}

#[cfg(target_os = "macos")]
fn stop_system_capture(system: Option<SystemCapture>) {
    if let Some(capture) = system {
        capture.stop();
    }
}

#[cfg(not(target_os = "macos"))]
fn stop_system_capture(_system: Option<SystemCapture>) {}
