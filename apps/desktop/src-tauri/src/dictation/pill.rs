use tauri::{AppHandle, Manager, Monitor, PhysicalPosition, WebviewWindow};

use crate::main_thread::run_on_main;

pub const DICTATION_WINDOW: &str = "dictation";
const PILL_WIDTH: f64 = 360.0;
const PILL_HEIGHT: f64 = 64.0;
const BOTTOM_OFFSET: f64 = 96.0;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ScreenRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub fn pill_origin(screen: ScreenRect, scale: f64) -> (f64, f64) {
    let width = PILL_WIDTH * scale;
    let height = PILL_HEIGHT * scale;
    let x = screen.x + (screen.width - width) / 2.0;
    let y = screen.y + screen.height - height - BOTTOM_OFFSET * scale;
    (x.round(), y.round())
}

pub async fn show_pill(app: &AppHandle) -> Result<(), String> {
    let window = pill_window(app)?;
    position_pill(app, &window)?;
    let _ = window.set_focusable(false);
    run_on_main(app, move || platform::order_front_without_focus(&window)).await?
}

pub fn hide_pill(app: &AppHandle) -> Result<(), String> {
    pill_window(app)?.hide().map_err(|error| error.to_string())
}

fn pill_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(DICTATION_WINDOW)
        .ok_or_else(|| "dictation_window_missing".to_string())
}

fn cursor_monitor(app: &AppHandle) -> Option<Monitor> {
    let cursor = app.cursor_position().ok()?;
    app.monitor_from_point(cursor.x, cursor.y).ok().flatten()
}

fn position_pill(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {
    let monitor = cursor_monitor(app)
        .or_else(|| app.primary_monitor().ok().flatten())
        .ok_or_else(|| "monitor_unavailable".to_string())?;
    let screen = ScreenRect {
        x: f64::from(monitor.position().x),
        y: f64::from(monitor.position().y),
        width: f64::from(monitor.size().width),
        height: f64::from(monitor.size().height),
    };
    let (x, y) = pill_origin(screen, monitor.scale_factor());
    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
mod platform {
    use objc2_app_kit::{NSStatusWindowLevel, NSWindow, NSWindowCollectionBehavior};
    use tauri::WebviewWindow;

    pub fn order_front_without_focus(window: &WebviewWindow) -> Result<(), String> {
        let pointer = window.ns_window().map_err(|error| error.to_string())?;
        if pointer.is_null() {
            return Err("dictation_window_unavailable".into());
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
}

#[cfg(not(target_os = "macos"))]
mod platform {
    use tauri::WebviewWindow;

    pub fn order_front_without_focus(window: &WebviewWindow) -> Result<(), String> {
        window.show().map_err(|error| error.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn centers_the_pill_near_the_bottom_on_retina_screens() {
        let screen = ScreenRect {
            x: 0.0,
            y: 0.0,
            width: 3024.0,
            height: 1964.0,
        };
        assert_eq!(pill_origin(screen, 2.0), (1152.0, 1644.0));
    }

    #[test]
    fn respects_the_monitor_offset() {
        let screen = ScreenRect {
            x: -1920.0,
            y: 120.0,
            width: 1920.0,
            height: 1080.0,
        };
        assert_eq!(pill_origin(screen, 1.0), (-1140.0, 1040.0));
    }
}
