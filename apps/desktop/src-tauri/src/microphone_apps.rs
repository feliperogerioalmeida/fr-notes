use std::collections::BTreeSet;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::events::MICROPHONE_APPS_CHANGED_EVENT;

const POLL_INTERVAL: Duration = Duration::from_millis(1500);

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MicApp {
    pub bundle_id: String,
    pub name: String,
    pub pid: i32,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MicrophoneAppsPayload {
    pub apps: Vec<MicApp>,
}

pub fn bundle_id_set(apps: &[MicApp]) -> BTreeSet<String> {
    apps.iter().map(|app| app.bundle_id.clone()).collect()
}

pub fn has_changed(previous: &BTreeSet<String>, current: &[MicApp]) -> bool {
    *previous != bundle_id_set(current)
}

pub fn spawn_microphone_apps_poller(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(POLL_INTERVAL);
        let mut previous = BTreeSet::new();
        loop {
            interval.tick().await;
            let Ok(apps) = tauri::async_runtime::spawn_blocking(list_microphone_apps).await else {
                continue;
            };
            let Ok(apps) = apps else {
                continue;
            };
            if !has_changed(&previous, &apps) {
                continue;
            }
            previous = bundle_id_set(&apps);
            let _ = app.emit(MICROPHONE_APPS_CHANGED_EVENT, MicrophoneAppsPayload { apps });
        }
    });
}

#[cfg(target_os = "macos")]
pub use platform::list_microphone_apps;

#[cfg(target_os = "macos")]
mod platform {
    use objc2::rc::autoreleasepool;
    use objc2_app_kit::NSRunningApplication;
    use objc2_core_audio::{
        kAudioHardwarePropertyProcessObjectList, kAudioProcessPropertyBundleID, kAudioProcessPropertyIsRunningInput,
        kAudioProcessPropertyPID, AudioObjectID,
    };

    use super::MicApp;
    use crate::core_audio::{read_array, read_string, read_value, status_error, SYSTEM_OBJECT};

    fn is_running_input(process: AudioObjectID) -> bool {
        read_value::<u32>(process, kAudioProcessPropertyIsRunningInput).is_ok_and(|value| value != 0)
    }

    fn running_application_details(pid: i32) -> (Option<String>, Option<String>) {
        let Some(application) = NSRunningApplication::runningApplicationWithProcessIdentifier(pid) else {
            return (None, None);
        };
        let name = application.localizedName().map(|name| name.to_string());
        let bundle_id = application.bundleIdentifier().map(|id| id.to_string());
        (name, bundle_id)
    }

    fn describe_process(process: AudioObjectID, own_pid: i32) -> Option<MicApp> {
        if !is_running_input(process) {
            return None;
        }
        let pid: i32 = read_value(process, kAudioProcessPropertyPID).ok()?;
        if pid == own_pid {
            return None;
        }
        let audio_bundle_id = read_string(process, kAudioProcessPropertyBundleID).unwrap_or_default();
        let (name, app_bundle_id) = running_application_details(pid);
        let bundle_id = Some(audio_bundle_id)
            .filter(|id| !id.is_empty())
            .or(app_bundle_id)
            .filter(|id| !id.is_empty())?;
        Some(MicApp {
            name: name.filter(|name| !name.is_empty()).unwrap_or_else(|| bundle_id.clone()),
            bundle_id,
            pid,
        })
    }

    pub fn list_microphone_apps() -> Result<Vec<MicApp>, String> {
        let own_pid = std::process::id() as i32;
        let processes: Vec<AudioObjectID> = read_array(SYSTEM_OBJECT, kAudioHardwarePropertyProcessObjectList)
            .map_err(|status| status_error("process_object_list", status))?;
        Ok(autoreleasepool(|_| {
            processes
                .into_iter()
                .filter_map(|process| describe_process(process, own_pid))
                .collect()
        }))
    }
}

#[cfg(not(target_os = "macos"))]
pub fn list_microphone_apps() -> Result<Vec<MicApp>, String> {
    Ok(Vec::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn app(bundle_id: &str, pid: i32) -> MicApp {
        MicApp {
            bundle_id: bundle_id.into(),
            name: bundle_id.into(),
            pid,
        }
    }

    #[test]
    fn detects_added_and_removed_apps() {
        let previous = bundle_id_set(&[app("us.zoom.xos", 10)]);
        assert!(has_changed(&previous, &[app("us.zoom.xos", 10), app("com.apple.FaceTime", 11)]));
        assert!(has_changed(&previous, &[]));
    }

    #[test]
    fn ignores_pid_changes_for_the_same_bundle() {
        let previous = bundle_id_set(&[app("us.zoom.xos", 10)]);
        assert!(!has_changed(&previous, &[app("us.zoom.xos", 99)]));
    }

    #[test]
    fn treats_duplicate_helpers_as_one_bundle() {
        let previous = bundle_id_set(&[app("com.google.Chrome.helper", 1)]);
        assert!(!has_changed(
            &previous,
            &[app("com.google.Chrome.helper", 1), app("com.google.Chrome.helper", 2)]
        ));
    }
}
