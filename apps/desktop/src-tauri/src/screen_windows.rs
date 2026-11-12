use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenWindow {
    pub owner: String,
    pub bundle_id: Option<String>,
    pub layer: i64,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[cfg(target_os = "macos")]
pub fn list_floating_windows() -> Vec<ScreenWindow> {
    macos::list_floating_windows()
}

#[cfg(not(target_os = "macos"))]
pub fn list_floating_windows() -> Vec<ScreenWindow> {
    Vec::new()
}

#[cfg(target_os = "macos")]
mod macos {
    use std::ffi::c_void;

    use objc2::rc::Retained;
    use objc2::runtime::AnyObject;
    use objc2_app_kit::NSRunningApplication;
    use objc2_foundation::{NSArray, NSDictionary, NSNumber, NSString};

    use super::ScreenWindow;

    const ON_SCREEN_ONLY: u32 = 1;
    const EXCLUDE_DESKTOP_ELEMENTS: u32 = 1 << 4;
    const NULL_WINDOW_ID: u32 = 0;
    const NORMAL_WINDOW_LAYER: i64 = 0;
    const MIN_VISIBLE_ALPHA: f64 = 0.05;
    const MIN_SIDE: f64 = 8.0;

    type WindowInfo = NSDictionary<NSString, AnyObject>;

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGWindowListCopyWindowInfo(option: u32, relative_to_window: u32) -> *mut c_void;
    }

    fn read_object(info: &WindowInfo, key: &str) -> Option<Retained<AnyObject>> {
        info.objectForKey(&NSString::from_str(key))
    }

    fn read_number(info: &WindowInfo, key: &str) -> Option<f64> {
        let object = read_object(info, key)?;
        object.downcast_ref::<NSNumber>().map(|number| number.doubleValue())
    }

    fn read_text(info: &WindowInfo, key: &str) -> Option<String> {
        let object = read_object(info, key)?;
        object.downcast_ref::<NSString>().map(|text| text.to_string())
    }

    fn read_bounds(info: &WindowInfo) -> Option<(f64, f64, f64, f64)> {
        let object = read_object(info, "kCGWindowBounds")?;
        let bounds: Retained<WindowInfo> = unsafe { Retained::cast_unchecked(object) };
        Some((
            read_number(&bounds, "X")?,
            read_number(&bounds, "Y")?,
            read_number(&bounds, "Width")?,
            read_number(&bounds, "Height")?,
        ))
    }

    fn read_bundle_id(pid: f64) -> Option<String> {
        let application = NSRunningApplication::runningApplicationWithProcessIdentifier(pid as i32)?;
        application.bundleIdentifier().map(|id| id.to_string())
    }

    fn to_floating_window(info: &WindowInfo, own_pid: f64) -> Option<ScreenWindow> {
        let layer = read_number(info, "kCGWindowLayer")? as i64;
        let alpha = read_number(info, "kCGWindowAlpha").unwrap_or(1.0);
        let pid = read_number(info, "kCGWindowOwnerPID").unwrap_or_default();
        if layer <= NORMAL_WINDOW_LAYER || alpha < MIN_VISIBLE_ALPHA || pid == own_pid {
            return None;
        }
        let (x, y, width, height) = read_bounds(info)?;
        if width < MIN_SIDE || height < MIN_SIDE {
            return None;
        }
        Some(ScreenWindow {
            owner: read_text(info, "kCGWindowOwnerName").unwrap_or_default(),
            bundle_id: read_bundle_id(pid),
            layer,
            x,
            y,
            width,
            height,
        })
    }

    pub fn list_floating_windows() -> Vec<ScreenWindow> {
        let raw = unsafe {
            CGWindowListCopyWindowInfo(ON_SCREEN_ONLY | EXCLUDE_DESKTOP_ELEMENTS, NULL_WINDOW_ID)
        };
        if raw.is_null() {
            return Vec::new();
        }
        let windows: Retained<NSArray<WindowInfo>> =
            match unsafe { Retained::from_raw(raw as *mut NSArray<WindowInfo>) } {
                Some(windows) => windows,
                None => return Vec::new(),
            };
        let own_pid = f64::from(std::process::id());
        windows
            .iter()
            .filter_map(|info| to_floating_window(&info, own_pid))
            .collect()
    }
}
