pub mod pill;
mod stream;
pub mod transcript;

use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc::unbounded_channel;
use tokio::sync::{watch, Mutex};
use tokio::task::JoinHandle;

use crate::audio::microphone::{start_microphone, MicrophoneCapture};
use crate::audio::ErrorReporter;
use crate::events::{emit_dictation_state, DictationLevelPayload, DICTATION_LEVEL_EVENT};
use crate::main_thread::run_on_main;
use crate::secrets::{read_secret, DEEPGRAM_API_KEY};
use crate::session::MISSING_DEEPGRAM_KEY_ERROR;
use crate::text_insertion::{frontmost_external_app, TargetApp, TargetAppInfo};
use crate::transcription::deepgram::DeepgramConfig;
use crate::transcription::stream::now_epoch_ms;
use pill::{hide_pill, show_pill};
use stream::{run_dictation_stream, DictationShared, DictationStream};

const LEVEL_EMIT_INTERVAL: Duration = Duration::from_millis(60);
const STOP_TIMEOUT: Duration = Duration::from_secs(5);
const ALREADY_RUNNING_ERROR: &str = "dictation_already_running";
const NOT_RUNNING_ERROR: &str = "dictation_not_running";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartDictationArgs {
    pub language: String,
    #[serde(default)]
    pub keyterms: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictationStarted {
    pub started_at_ms: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictationResult {
    pub text: String,
    pub target_app: Option<TargetApp>,
}

struct ActiveDictation {
    started_at_ms: u64,
    microphone: MicrophoneCapture,
    stop_tx: watch::Sender<bool>,
    stream_task: JoinHandle<()>,
    level_task: JoinHandle<()>,
    shared: DictationShared,
}

#[derive(Default)]
pub struct DictationManager {
    active: Mutex<Option<ActiveDictation>>,
    target: std::sync::Mutex<Option<TargetAppInfo>>,
}

impl DictationManager {
    pub async fn start(
        &self,
        app: &AppHandle,
        args: StartDictationArgs,
    ) -> Result<DictationStarted, String> {
        let mut active = self.active.lock().await;
        if active.is_some() {
            return Err(ALREADY_RUNNING_ERROR.into());
        }
        let api_key =
            read_secret(DEEPGRAM_API_KEY)?.ok_or_else(|| MISSING_DEEPGRAM_KEY_ERROR.to_string())?;
        self.remember_target(run_on_main(app, frontmost_external_app).await?);
        let session = start_session(app, args, api_key)?;
        let started = DictationStarted {
            started_at_ms: session.started_at_ms,
        };
        *active = Some(session);
        drop(active);
        emit_dictation_state(app, "listening");
        let _ = show_pill(app).await;
        Ok(started)
    }

    pub async fn stop(&self, app: &AppHandle) -> Result<DictationResult, String> {
        let session = self
            .active
            .lock()
            .await
            .take()
            .ok_or_else(|| NOT_RUNNING_ERROR.to_string())?;
        emit_dictation_state(app, "processing");
        let shared = session.shared.clone();
        shutdown_session(session, true).await;
        let text = shared.final_text();
        if let (true, Some(error)) = (text.is_empty(), shared.take_error()) {
            return Err(error);
        }
        Ok(DictationResult {
            text,
            target_app: self.target().as_ref().map(TargetApp::from),
        })
    }

    pub async fn cancel(&self, app: &AppHandle) -> Result<(), String> {
        if let Some(session) = self.active.lock().await.take() {
            shutdown_session(session, false).await;
        }
        hide_and_idle(app)
    }

    pub fn target(&self) -> Option<TargetAppInfo> {
        self.target.lock().ok().and_then(|target| target.clone())
    }

    fn remember_target(&self, target: Option<TargetAppInfo>) {
        if let Ok(mut slot) = self.target.lock() {
            *slot = target;
        }
    }
}

pub fn hide_and_idle(app: &AppHandle) -> Result<(), String> {
    let hidden = hide_pill(app);
    emit_dictation_state(app, "idle");
    hidden
}

fn start_session(
    app: &AppHandle,
    args: StartDictationArgs,
    api_key: String,
) -> Result<ActiveDictation, String> {
    let shared = DictationShared::default();
    let error_shared = shared.clone();
    let report_error: ErrorReporter = Arc::new(move |message| error_shared.record_error(message));
    let (audio_tx, audio_rx) = unbounded_channel();
    let (microphone, sample_rate) = start_microphone(audio_tx, report_error)?;
    let (stop_tx, stop_rx) = watch::channel(false);
    let stream = DictationStream {
        app: app.clone(),
        config: DeepgramConfig {
            api_key,
            language: args.language,
            keyterms: args.keyterms,
            sample_rate,
            diarize: false,
        },
        shared: shared.clone(),
    };
    Ok(ActiveDictation {
        started_at_ms: now_epoch_ms(),
        microphone,
        stop_tx,
        stream_task: tokio::spawn(run_dictation_stream(stream, audio_rx, stop_rx)),
        level_task: spawn_level_emitter(app.clone(), shared.clone()),
        shared,
    })
}

fn spawn_level_emitter(app: AppHandle, shared: DictationShared) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(LEVEL_EMIT_INTERVAL);
        loop {
            interval.tick().await;
            let level = f32::from_bits(shared.level.swap(0, Ordering::Relaxed));
            let _ = app.emit(DICTATION_LEVEL_EVENT, DictationLevelPayload { level });
        }
    })
}

async fn shutdown_session(session: ActiveDictation, wait_for_results: bool) {
    let microphone = session.microphone;
    let _ = tokio::task::spawn_blocking(move || microphone.stop()).await;
    let _ = session.stop_tx.send(true);
    session.level_task.abort();
    if !wait_for_results {
        session.stream_task.abort();
        return;
    }
    let abort_handle = session.stream_task.abort_handle();
    if tokio::time::timeout(STOP_TIMEOUT, session.stream_task)
        .await
        .is_err()
    {
        abort_handle.abort();
    }
}
