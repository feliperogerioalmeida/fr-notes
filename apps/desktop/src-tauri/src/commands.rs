use tauri::{AppHandle, State};

use crate::calendar::{self, CalendarEvent, CalendarInfo, ListEventsArgs};
use crate::dictation::{
    hide_and_idle, DictationManager, DictationResult, DictationStarted, StartDictationArgs,
};
use crate::microphone_apps::{self, MicApp};
use crate::permissions::{self, Permissions};
use crate::secrets::{read_secret, remove_secret, write_secret};
use crate::session::{RecordingManager, RecordingStarted, RecordingStatus, StartRecordingArgs};
use crate::windows::set_nub_visible;
use crate::{fn_key, text_insertion};

#[tauri::command]
pub fn get_secret(key: String) -> Result<Option<String>, String> {
    read_secret(&key)
}

#[tauri::command]
pub fn set_secret(key: String, value: String) -> Result<(), String> {
    write_secret(&key, &value)
}

#[tauri::command]
pub fn delete_secret(key: String) -> Result<(), String> {
    remove_secret(&key)
}

#[tauri::command]
pub fn has_secret(key: String) -> Result<bool, String> {
    read_secret(&key).map(|value| value.is_some())
}

#[tauri::command]
pub async fn start_recording(
    app: AppHandle,
    manager: State<'_, RecordingManager>,
    args: StartRecordingArgs,
) -> Result<RecordingStarted, String> {
    manager.start(&app, args).await
}

#[tauri::command]
pub async fn stop_recording(
    app: AppHandle,
    manager: State<'_, RecordingManager>,
) -> Result<(), String> {
    let _ = set_nub_visible(&app, false);
    manager.stop(&app).await
}

#[tauri::command]
pub async fn get_recording_status(
    manager: State<'_, RecordingManager>,
) -> Result<RecordingStatus, String> {
    Ok(manager.status().await)
}

#[tauri::command]
pub fn check_permissions() -> Result<Permissions, String> {
    Ok(permissions::read_permissions())
}

#[tauri::command]
pub async fn request_microphone_permission() -> Result<bool, String> {
    Ok(permissions::request_microphone().await)
}

#[tauri::command]
pub fn request_screen_capture_permission() -> Result<bool, String> {
    Ok(permissions::request_screen_capture())
}

#[tauri::command]
pub fn open_privacy_settings(pane: String) -> Result<(), String> {
    permissions::open_privacy_pane(&pane)
}

#[tauri::command]
pub fn show_nub(app: AppHandle, visible: bool) -> Result<(), String> {
    set_nub_visible(&app, visible)
}

#[tauri::command]
pub async fn request_system_audio_permission() -> Result<bool, String> {
    Ok(permissions::request_system_audio().await)
}

#[tauri::command]
pub async fn request_calendar_access() -> Result<bool, String> {
    run_blocking(calendar::request_access).await
}

#[tauri::command]
pub async fn list_calendars() -> Result<Vec<CalendarInfo>, String> {
    run_blocking(calendar::list_calendars).await
}

#[tauri::command]
pub async fn list_calendar_events(args: ListEventsArgs) -> Result<Vec<CalendarEvent>, String> {
    run_blocking(move || calendar::list_events(&args)).await
}

#[tauri::command]
pub async fn list_microphone_apps() -> Result<Vec<MicApp>, String> {
    run_blocking(microphone_apps::list_microphone_apps).await
}

#[tauri::command]
pub fn request_accessibility_permission() -> Result<bool, String> {
    Ok(permissions::request_accessibility())
}

#[tauri::command]
pub async fn start_dictation(
    app: AppHandle,
    manager: State<'_, DictationManager>,
    args: StartDictationArgs,
) -> Result<DictationStarted, String> {
    manager.start(&app, args).await
}

#[tauri::command]
pub async fn stop_dictation(
    app: AppHandle,
    manager: State<'_, DictationManager>,
) -> Result<DictationResult, String> {
    manager.stop(&app).await
}

#[tauri::command]
pub async fn cancel_dictation(
    app: AppHandle,
    manager: State<'_, DictationManager>,
) -> Result<(), String> {
    manager.cancel(&app).await
}

#[tauri::command]
pub fn hide_dictation_pill(app: AppHandle) -> Result<(), String> {
    hide_and_idle(&app)
}

#[tauri::command]
pub async fn insert_text(
    app: AppHandle,
    manager: State<'_, DictationManager>,
    text: String,
) -> Result<(), String> {
    text_insertion::insert_text(&app, text, manager.target()).await
}

#[tauri::command]
pub async fn set_fn_key_monitoring(app: AppHandle, enabled: bool) -> Result<(), String> {
    fn_key::set_monitoring(&app, enabled).await
}

async fn run_blocking<T, F>(task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|error| error.to_string())?
}
