use tauri::{AppHandle, LogicalPosition, Manager, WebviewWindow};

pub const MAIN_WINDOW: &str = "main";
pub const NUB_WINDOW: &str = "nub";
const NUB_EDGE_MARGIN: f64 = 12.0;
const NUB_VERTICAL_RATIO: f64 = 0.38;

pub fn show_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        return;
    };
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn set_nub_visible(app: &AppHandle, visible: bool) -> Result<(), String> {
    let nub = app
        .get_webview_window(NUB_WINDOW)
        .ok_or_else(|| "nub_window_missing".to_string())?;
    if !visible {
        return nub.hide().map_err(|error| error.to_string());
    }
    position_nub(app, &nub)?;
    let _ = nub.set_focusable(false);
    nub.show().map_err(|error| error.to_string())
}

fn position_nub(app: &AppHandle, nub: &WebviewWindow) -> Result<(), String> {
    let monitor = app
        .get_webview_window(MAIN_WINDOW)
        .and_then(|main| main.current_monitor().ok().flatten())
        .or_else(|| nub.primary_monitor().ok().flatten())
        .ok_or_else(|| "monitor_unavailable".to_string())?;
    let scale = monitor.scale_factor();
    let origin = monitor.position().to_logical::<f64>(scale);
    let size = monitor.size().to_logical::<f64>(scale);
    let nub_size = nub
        .outer_size()
        .map_err(|error| error.to_string())?
        .to_logical::<f64>(scale);
    let x = origin.x + size.width - nub_size.width - NUB_EDGE_MARGIN;
    let y = origin.y + size.height * NUB_VERTICAL_RATIO;
    nub.set_position(LogicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}
