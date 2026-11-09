use serde::Serialize;

pub const GRANTED: &str = "granted";
pub const DENIED: &str = "denied";
pub const UNDETERMINED: &str = "undetermined";
pub const RESTRICTED: &str = "restricted";

const MICROPHONE_SETTINGS_URL: &str =
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone";
const SCREEN_CAPTURE_SETTINGS_URL: &str =
    "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";
const SYSTEM_AUDIO_SETTINGS_URL: &str =
    "x-apple.systempreferences:com.apple.preference.security?Privacy_AudioCapture";
const CALENDAR_SETTINGS_URL: &str =
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars";
const ACCESSIBILITY_SETTINGS_URL: &str =
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Permissions {
    pub microphone: String,
    pub screen_capture: String,
    pub system_audio: String,
    pub calendar: String,
    pub accessibility: String,
}

pub fn read_permissions() -> Permissions {
    Permissions {
        microphone: platform::microphone_status().to_string(),
        screen_capture: platform::screen_capture_status().to_string(),
        system_audio: platform::system_audio_status().to_string(),
        calendar: crate::calendar::authorization_status().to_string(),
        accessibility: accessibility_status().to_string(),
    }
}

fn accessibility_status() -> &'static str {
    if crate::accessibility::is_trusted() {
        return GRANTED;
    }
    DENIED
}

pub fn request_accessibility() -> bool {
    crate::accessibility::request_trust()
}

pub async fn request_microphone() -> bool {
    let Some(receiver) = platform::begin_microphone_request() else {
        return false;
    };
    receiver.await.unwrap_or(false)
}

pub fn request_screen_capture() -> bool {
    platform::request_screen_capture()
}

pub async fn request_system_audio() -> bool {
    platform::request_system_audio().await
}

pub fn open_privacy_pane(pane: &str) -> Result<(), String> {
    let url = match pane {
        "microphone" => MICROPHONE_SETTINGS_URL,
        "screen-capture" => SCREEN_CAPTURE_SETTINGS_URL,
        "system-audio" => SYSTEM_AUDIO_SETTINGS_URL,
        "calendar" => CALENDAR_SETTINGS_URL,
        "accessibility" => ACCESSIBILITY_SETTINGS_URL,
        other => return Err(format!("unknown_privacy_pane:{other}")),
    };
    std::process::Command::new("open")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
mod platform {
    use std::sync::Mutex;

    use block2::RcBlock;
    use objc2::runtime::Bool;
    use objc2_av_foundation::{AVAuthorizationStatus, AVCaptureDevice, AVMediaTypeAudio};
    use tokio::sync::oneshot;

    use super::{DENIED, GRANTED, RESTRICTED, UNDETERMINED};

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGPreflightScreenCaptureAccess() -> bool;
        fn CGRequestScreenCaptureAccess() -> bool;
    }

    pub fn microphone_status() -> &'static str {
        let Some(media_type) = (unsafe { AVMediaTypeAudio }) else {
            return UNDETERMINED;
        };
        let status = unsafe { AVCaptureDevice::authorizationStatusForMediaType(media_type) };
        match status {
            AVAuthorizationStatus::Authorized => GRANTED,
            AVAuthorizationStatus::Denied => DENIED,
            AVAuthorizationStatus::Restricted => RESTRICTED,
            _ => UNDETERMINED,
        }
    }

    pub fn begin_microphone_request() -> Option<oneshot::Receiver<bool>> {
        let media_type = unsafe { AVMediaTypeAudio }?;
        let (sender, receiver) = oneshot::channel();
        let sender = Mutex::new(Some(sender));
        let handler = RcBlock::new(move |granted: Bool| {
            let pending = sender.lock().ok().and_then(|mut slot| slot.take());
            if let Some(pending) = pending {
                let _ = pending.send(granted.as_bool());
            }
        });
        unsafe {
            AVCaptureDevice::requestAccessForMediaType_completionHandler(media_type, &handler)
        };
        Some(receiver)
    }

    pub fn screen_capture_status() -> &'static str {
        if unsafe { CGPreflightScreenCaptureAccess() } {
            return GRANTED;
        }
        UNDETERMINED
    }

    pub fn request_screen_capture() -> bool {
        unsafe { CGRequestScreenCaptureAccess() }
    }

    pub fn system_audio_status() -> &'static str {
        crate::tcc::audio_capture_status()
    }

    pub async fn request_system_audio() -> bool {
        let granted = match crate::tcc::begin_audio_capture_request() {
            Some(receiver) => receiver.await.unwrap_or(false),
            None => tokio::task::spawn_blocking(probe_process_tap)
                .await
                .unwrap_or(false),
        };
        crate::tcc::record_audio_capture_result(granted);
        granted
    }

    fn probe_process_tap() -> bool {
        let (audio_tx, _audio_rx) = tokio::sync::mpsc::unbounded_channel();
        match crate::audio::process_tap::start_process_tap(audio_tx) {
            Ok((capture, _)) => {
                capture.stop();
                true
            }
            Err(_) => false,
        }
    }
}

#[cfg(not(target_os = "macos"))]
mod platform {
    use tokio::sync::oneshot;

    use super::GRANTED;

    pub fn microphone_status() -> &'static str {
        GRANTED
    }

    pub fn begin_microphone_request() -> Option<oneshot::Receiver<bool>> {
        None
    }

    pub fn screen_capture_status() -> &'static str {
        GRANTED
    }

    pub fn request_screen_capture() -> bool {
        true
    }

    pub fn system_audio_status() -> &'static str {
        GRANTED
    }

    pub async fn request_system_audio() -> bool {
        true
    }
}
