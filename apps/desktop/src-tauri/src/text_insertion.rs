use std::time::Duration;

use serde::Serialize;
use tauri::AppHandle;

use crate::accessibility::{is_trusted, ACCESSIBILITY_REQUIRED_ERROR};
use crate::main_thread::run_on_main;

const ACTIVATION_DELAY: Duration = Duration::from_millis(120);
const PASTEBOARD_RESTORE_DELAY: Duration = Duration::from_millis(350);

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TargetAppInfo {
    pub pid: i32,
    pub bundle_id: String,
    pub name: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TargetApp {
    pub name: String,
    pub bundle_id: String,
}

impl From<&TargetAppInfo> for TargetApp {
    fn from(info: &TargetAppInfo) -> Self {
        Self {
            name: info.name.clone(),
            bundle_id: info.bundle_id.clone(),
        }
    }
}

pub fn frontmost_external_app() -> Option<TargetAppInfo> {
    let info = platform::frontmost_app()?;
    if info.pid == std::process::id() as i32 {
        return None;
    }
    Some(info)
}

pub async fn insert_text(app: &AppHandle, text: String, target: Option<TargetAppInfo>) -> Result<(), String> {
    if !is_trusted() {
        return Err(ACCESSIBILITY_REQUIRED_ERROR.into());
    }
    if let Some(target) = target {
        refocus_target(app, target).await?;
    }
    let previous = run_on_main(app, move || platform::replace_pasteboard(&text)).await?;
    platform::post_paste_shortcut();
    tokio::time::sleep(PASTEBOARD_RESTORE_DELAY).await;
    run_on_main(app, move || platform::restore_pasteboard(previous)).await
}

async fn refocus_target(app: &AppHandle, target: TargetAppInfo) -> Result<(), String> {
    let own_app_is_frontmost = run_on_main(app, platform::is_own_app_frontmost).await?;
    if !own_app_is_frontmost {
        return Ok(());
    }
    run_on_main(app, move || platform::activate_app(target.pid)).await?;
    tokio::time::sleep(ACTIVATION_DELAY).await;
    Ok(())
}

#[cfg(target_os = "macos")]
mod platform {
    use std::ffi::c_void;

    use objc2::rc::autoreleasepool;
    use objc2_app_kit::{
        NSApplicationActivationOptions, NSPasteboard, NSPasteboardTypeString, NSRunningApplication, NSWorkspace,
    };
    use objc2_foundation::NSString;

    use super::TargetAppInfo;

    const ANSI_V_KEY_CODE: u16 = 9;
    const COMMAND_FLAG: u64 = 1 << 20;
    const HID_SYSTEM_STATE: i32 = 1;
    const HID_EVENT_TAP: u32 = 0;

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGEventSourceCreate(state_id: i32) -> *mut c_void;
        fn CGEventCreateKeyboardEvent(source: *mut c_void, virtual_key: u16, key_down: bool) -> *mut c_void;
        fn CGEventSetFlags(event: *mut c_void, flags: u64);
        fn CGEventPost(tap: u32, event: *mut c_void);
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFRelease(object: *const c_void);
    }

    pub fn frontmost_app() -> Option<TargetAppInfo> {
        autoreleasepool(|_| {
            let app = NSWorkspace::sharedWorkspace().frontmostApplication()?;
            let bundle_id = app.bundleIdentifier().map(|id| id.to_string()).unwrap_or_default();
            let name = app
                .localizedName()
                .map(|name| name.to_string())
                .unwrap_or_else(|| bundle_id.clone());
            Some(TargetAppInfo {
                pid: app.processIdentifier(),
                bundle_id,
                name,
            })
        })
    }

    pub fn is_own_app_frontmost() -> bool {
        NSRunningApplication::currentApplication().isActive()
    }

    pub fn activate_app(pid: i32) -> bool {
        NSRunningApplication::runningApplicationWithProcessIdentifier(pid)
            .map(|app| app.activateWithOptions(NSApplicationActivationOptions::ActivateAllWindows))
            .unwrap_or(false)
    }

    pub fn replace_pasteboard(text: &str) -> Option<String> {
        autoreleasepool(|_| {
            let pasteboard = NSPasteboard::generalPasteboard();
            let string_type = unsafe { NSPasteboardTypeString };
            let previous = pasteboard.stringForType(string_type).map(|value| value.to_string());
            pasteboard.clearContents();
            pasteboard.setString_forType(&NSString::from_str(text), string_type);
            previous
        })
    }

    pub fn restore_pasteboard(previous: Option<String>) {
        autoreleasepool(|_| {
            let pasteboard = NSPasteboard::generalPasteboard();
            pasteboard.clearContents();
            if let Some(value) = previous {
                pasteboard.setString_forType(&NSString::from_str(&value), unsafe { NSPasteboardTypeString });
            }
        });
    }

    pub fn post_paste_shortcut() {
        unsafe {
            let source = CGEventSourceCreate(HID_SYSTEM_STATE);
            post_key(source, true);
            post_key(source, false);
            if !source.is_null() {
                CFRelease(source);
            }
        }
    }

    unsafe fn post_key(source: *mut c_void, key_down: bool) {
        let event = CGEventCreateKeyboardEvent(source, ANSI_V_KEY_CODE, key_down);
        if event.is_null() {
            return;
        }
        CGEventSetFlags(event, COMMAND_FLAG);
        CGEventPost(HID_EVENT_TAP, event);
        CFRelease(event);
    }
}

#[cfg(not(target_os = "macos"))]
mod platform {
    use super::TargetAppInfo;

    pub fn frontmost_app() -> Option<TargetAppInfo> {
        None
    }

    pub fn is_own_app_frontmost() -> bool {
        false
    }

    pub fn activate_app(_pid: i32) -> bool {
        false
    }

    pub fn replace_pasteboard(_text: &str) -> Option<String> {
        None
    }

    pub fn restore_pasteboard(_previous: Option<String>) {}

    pub fn post_paste_shortcut() {}
}
