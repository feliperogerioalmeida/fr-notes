mod accessibility;
mod audio;
mod calendar;
mod commands;
#[cfg(target_os = "macos")]
mod core_audio;
mod dictation;
mod events;
mod fn_key;
mod main_thread;
mod microphone_apps;
mod permissions;
mod recordings;
mod screen_windows;
mod secrets;
mod session;
mod speaker_ax;
#[cfg(target_os = "macos")]
mod tcc;
mod text_insertion;
mod transcription;
mod tray;
mod windows;

use tauri::{AppHandle, RunEvent, Window, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

use dictation::DictationManager;
use session::RecordingManager;
use speaker_ax::SpeakerMonitor;
use windows::{show_main_window, MAIN_WINDOW};

const HIDDEN_LAUNCH_ARG: &str = "--hidden";

fn launched_hidden() -> bool {
    std::env::args().any(|arg| arg == HIDDEN_LAUNCH_ARG)
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![HIDDEN_LAUNCH_ARG]),
        ))
        .manage(RecordingManager::default())
        .manage(DictationManager::default())
        .manage(SpeakerMonitor::default())
        .setup(|app| {
            tray::install_tray(app.handle())?;
            microphone_apps::spawn_microphone_apps_poller(app.handle().clone());
            let recovery_handle = app.handle().clone();
            std::thread::spawn(move || recordings::files::recover_leftovers(&recovery_handle));
            if !launched_hidden() {
                show_main_window(app.handle());
            }
            Ok(())
        })
        .on_window_event(hide_main_window_on_close)
        .invoke_handler(tauri::generate_handler![
            commands::get_secret,
            commands::set_secret,
            commands::delete_secret,
            commands::has_secret,
            commands::start_recording,
            commands::stop_recording,
            commands::get_recording_status,
            commands::check_permissions,
            commands::request_microphone_permission,
            commands::request_screen_capture_permission,
            commands::open_privacy_settings,
            commands::show_nub,
            commands::set_tray_title,
            commands::request_system_audio_permission,
            commands::request_calendar_access,
            commands::list_calendars,
            commands::list_calendar_events,
            commands::list_microphone_apps,
            commands::list_floating_windows,
            commands::request_accessibility_permission,
            commands::start_dictation,
            commands::stop_dictation,
            commands::cancel_dictation,
            commands::hide_dictation_pill,
            commands::insert_text,
            commands::set_fn_key_monitoring,
            commands::start_speaker_monitor,
            commands::stop_speaker_monitor,
            commands::reveal_speaker_diagnostics,
            commands::list_recordings,
            commands::reveal_recordings,
            commands::retranscribe_recordings,
            commands::cleanup_recordings,
        ])
        .build(tauri::generate_context!())
        .expect("error while building FR Notes");
    app.run(handle_run_event);
}

fn hide_main_window_on_close(window: &Window, event: &WindowEvent) {
    if window.label() != MAIN_WINDOW {
        return;
    }
    if let WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
    }
}

fn handle_run_event(app: &AppHandle, event: RunEvent) {
    #[cfg(target_os = "macos")]
    if let RunEvent::Reopen { .. } = event {
        show_main_window(app);
    }
    #[cfg(not(target_os = "macos"))]
    let _ = (app, event);
}
