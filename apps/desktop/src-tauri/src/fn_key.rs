use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use tauri::{AppHandle, Emitter};

use crate::events::{FnKeyPayload, DICTATION_FN_KEY_EVENT};
use crate::main_thread::run_on_main;

const SHIFT_FLAG: u64 = 1 << 17;
const CONTROL_FLAG: u64 = 1 << 18;
const OPTION_FLAG: u64 = 1 << 19;
const COMMAND_FLAG: u64 = 1 << 20;
const FUNCTION_FLAG: u64 = 1 << 23;
const OTHER_MODIFIERS: u64 = SHIFT_FLAG | CONTROL_FLAG | OPTION_FLAG | COMMAND_FLAG;

pub fn next_fn_state(pressed: bool, flags: u64) -> Option<bool> {
    let function_down = flags & FUNCTION_FLAG != 0;
    let others_down = flags & OTHER_MODIFIERS != 0;
    match (pressed, function_down) {
        (false, true) if !others_down => Some(true),
        (true, false) => Some(false),
        _ => None,
    }
}

pub fn handle_flags_changed(app: &AppHandle, pressed: &AtomicBool, flags: u64) {
    let Some(next) = next_fn_state(pressed.load(Ordering::Relaxed), flags) else {
        return;
    };
    pressed.store(next, Ordering::Relaxed);
    let _ = app.emit(DICTATION_FN_KEY_EVENT, FnKeyPayload { pressed: next });
}

pub async fn set_monitoring(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let handle = app.clone();
    run_on_main(app, move || {
        platform::remove_monitors();
        if enabled {
            platform::install_monitors(handle, Arc::new(AtomicBool::new(false)));
        }
    })
    .await
}

#[cfg(target_os = "macos")]
mod platform {
    use std::cell::RefCell;
    use std::ptr::NonNull;
    use std::sync::atomic::AtomicBool;
    use std::sync::Arc;

    use block2::RcBlock;
    use objc2::rc::Retained;
    use objc2::runtime::AnyObject;
    use objc2_app_kit::{NSEvent, NSEventMask};
    use tauri::AppHandle;

    use super::handle_flags_changed;

    thread_local! {
        static MONITORS: RefCell<Vec<Retained<AnyObject>>> = const { RefCell::new(Vec::new()) };
    }

    fn flags_of(event: NonNull<NSEvent>) -> u64 {
        unsafe { event.as_ref() }.modifierFlags().bits() as u64
    }

    pub fn install_monitors(app: AppHandle, pressed: Arc<AtomicBool>) {
        let global_app = app.clone();
        let global_pressed = pressed.clone();
        let global_block = RcBlock::new(move |event: NonNull<NSEvent>| {
            handle_flags_changed(&global_app, &global_pressed, flags_of(event));
        });
        let local_block = RcBlock::new(move |event: NonNull<NSEvent>| -> *mut NSEvent {
            handle_flags_changed(&app, &pressed, flags_of(event));
            event.as_ptr()
        });
        let global = NSEvent::addGlobalMonitorForEventsMatchingMask_handler(
            NSEventMask::FlagsChanged,
            &global_block,
        );
        let local = unsafe {
            NSEvent::addLocalMonitorForEventsMatchingMask_handler(
                NSEventMask::FlagsChanged,
                &local_block,
            )
        };
        MONITORS.with(|monitors| {
            monitors
                .borrow_mut()
                .extend(global.into_iter().chain(local))
        });
    }

    pub fn remove_monitors() {
        MONITORS.with(|monitors| {
            for monitor in monitors.borrow_mut().drain(..) {
                unsafe { NSEvent::removeMonitor(&monitor) };
            }
        });
    }
}

#[cfg(not(target_os = "macos"))]
mod platform {
    use std::sync::atomic::AtomicBool;
    use std::sync::Arc;

    use tauri::AppHandle;

    pub fn install_monitors(_app: AppHandle, _pressed: Arc<AtomicBool>) {}

    pub fn remove_monitors() {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn presses_on_fn_alone() {
        assert_eq!(next_fn_state(false, FUNCTION_FLAG), Some(true));
    }

    #[test]
    fn ignores_fn_combined_with_other_modifiers() {
        assert_eq!(next_fn_state(false, FUNCTION_FLAG | COMMAND_FLAG), None);
        assert_eq!(next_fn_state(false, FUNCTION_FLAG | SHIFT_FLAG), None);
    }

    #[test]
    fn releases_when_fn_goes_up_even_with_other_modifiers() {
        assert_eq!(next_fn_state(true, 0), Some(false));
        assert_eq!(next_fn_state(true, OPTION_FLAG), Some(false));
    }

    #[test]
    fn ignores_repeated_states() {
        assert_eq!(next_fn_state(true, FUNCTION_FLAG), None);
        assert_eq!(next_fn_state(true, FUNCTION_FLAG | CONTROL_FLAG), None);
        assert_eq!(next_fn_state(false, 0), None);
        assert_eq!(next_fn_state(false, SHIFT_FLAG), None);
    }
}
