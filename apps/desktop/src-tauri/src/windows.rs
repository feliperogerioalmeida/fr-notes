use tauri::{AppHandle, Manager, WebviewWindow};

use crate::main_thread::run_on_main;

pub const MAIN_WINDOW: &str = "main";
pub const NUB_WINDOW: &str = "nub";

pub fn show_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        return;
    };
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn nub_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(NUB_WINDOW)
        .ok_or_else(|| "nub_window_missing".to_string())
}

pub fn hide_nub(app: &AppHandle) -> Result<(), String> {
    nub_window(app)?.hide().map_err(|error| error.to_string())
}

pub async fn set_nub_visible(app: &AppHandle, visible: bool) -> Result<(), String> {
    let nub = nub_window(app)?;
    if !visible {
        return nub.hide().map_err(|error| error.to_string());
    }
    let _ = nub.set_focusable(false);
    run_on_main(app, move || order_front_without_focus(&nub)).await?
}

#[cfg(target_os = "macos")]
pub fn order_front_without_focus(window: &WebviewWindow) -> Result<(), String> {
    use objc2_app_kit::{NSStatusWindowLevel, NSWindow, NSWindowCollectionBehavior};

    let pointer = window.ns_window().map_err(|error| error.to_string())?;
    if pointer.is_null() {
        return Err("window_unavailable".into());
    }
    let ns_window = unsafe { &*(pointer as *const NSWindow) };
    ns_window.setCollectionBehavior(
        NSWindowCollectionBehavior::CanJoinAllSpaces
            | NSWindowCollectionBehavior::FullScreenAuxiliary
            | NSWindowCollectionBehavior::Stationary,
    );
    ns_window.setLevel(NSStatusWindowLevel);
    ns_window.orderFrontRegardless();
    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn order_front_without_focus(window: &WebviewWindow) -> Result<(), String> {
    window.show().map_err(|error| error.to_string())
}
