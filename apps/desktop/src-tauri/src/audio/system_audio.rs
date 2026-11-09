use tokio::sync::mpsc::UnboundedSender;

use super::process_tap::{start_process_tap, ProcessTapCapture, TapError};
use super::screen_capture::{start_screen_capture_audio, ScreenCaptureAudio};

pub const SYSTEM_AUDIO_PERMISSION_DENIED: &str = "system_audio_permission_denied";

pub enum SystemAudioCapture {
    ProcessTap(ProcessTapCapture),
    ScreenCapture(ScreenCaptureAudio),
}

impl SystemAudioCapture {
    pub fn stop(self) {
        match self {
            Self::ProcessTap(capture) => capture.stop(),
            Self::ScreenCapture(capture) => capture.stop(),
        }
    }
}

pub fn start_system_audio(
    audio_tx: UnboundedSender<Vec<f32>>,
) -> Result<(SystemAudioCapture, u32), String> {
    match start_process_tap(audio_tx.clone()) {
        Ok((capture, sample_rate)) => Ok((SystemAudioCapture::ProcessTap(capture), sample_rate)),
        Err(TapError::PermissionDenied) => Err(SYSTEM_AUDIO_PERMISSION_DENIED.into()),
        Err(TapError::Unavailable) => start_fallback(audio_tx, "process_tap_unavailable"),
        Err(TapError::Failed(reason)) => start_fallback(audio_tx, &reason),
    }
}

fn start_fallback(
    audio_tx: UnboundedSender<Vec<f32>>,
    tap_reason: &str,
) -> Result<(SystemAudioCapture, u32), String> {
    start_screen_capture_audio(audio_tx)
        .map(|(capture, sample_rate)| (SystemAudioCapture::ScreenCapture(capture), sample_rate))
        .map_err(|error| format!("{tap_reason}; screen_capture_fallback: {error}"))
}
