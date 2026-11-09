use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub const RECORDING_LEVEL_EVENT: &str = "recording:level";
pub const TRANSCRIPT_SEGMENT_EVENT: &str = "transcript:segment";
pub const RECORDING_STATE_EVENT: &str = "recording:state";
pub const RECORDING_ERROR_EVENT: &str = "recording:error";
pub const TRAY_NEW_NOTE_EVENT: &str = "tray:new-note";
pub const MICROPHONE_APPS_CHANGED_EVENT: &str = "microphone-apps:changed";
pub const DICTATION_LEVEL_EVENT: &str = "dictation:level";
pub const DICTATION_PARTIAL_EVENT: &str = "dictation:partial";
pub const DICTATION_STATE_EVENT: &str = "dictation:state";
pub const DICTATION_FN_KEY_EVENT: &str = "dictation:fn-key";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AudioSource {
    Microphone,
    System,
}

impl AudioSource {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Microphone => "microphone",
            Self::System => "system",
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingLevelPayload {
    pub microphone: f32,
    pub system: f32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptSegmentPayload {
    pub note_id: String,
    pub source: &'static str,
    pub text: String,
    pub is_final: bool,
    pub start_ms: u64,
    pub end_ms: u64,
    pub segment_key: String,
    pub speaker: Option<u32>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStatePayload {
    pub status: &'static str,
    pub note_id: Option<String>,
    pub message: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingErrorPayload {
    pub source: &'static str,
    pub message: String,
}

pub fn emit_recording_error(app: &AppHandle, source: &'static str, message: impl Into<String>) {
    let payload = RecordingErrorPayload {
        source,
        message: message.into(),
    };
    let _ = app.emit(RECORDING_ERROR_EVENT, payload);
}

pub fn emit_recording_state(app: &AppHandle, status: &'static str, note_id: Option<String>) {
    let payload = RecordingStatePayload {
        status,
        note_id,
        message: None,
    };
    let _ = app.emit(RECORDING_STATE_EVENT, payload);
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictationLevelPayload {
    pub level: f32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictationPartialPayload {
    pub text: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictationStatePayload {
    pub status: &'static str,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FnKeyPayload {
    pub pressed: bool,
}

pub fn emit_dictation_state(app: &AppHandle, status: &'static str) {
    let _ = app.emit(DICTATION_STATE_EVENT, DictationStatePayload { status });
}
