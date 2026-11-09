use std::ffi::{c_char, c_int, c_void, CStr};
use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::{Mutex, OnceLock};

use block2::RcBlock;
use objc2_foundation::NSString;
use tokio::sync::oneshot;

use crate::permissions::{DENIED, GRANTED, UNDETERMINED};

const TCC_FRAMEWORK_PATH: &CStr = c"/System/Library/PrivateFrameworks/TCC.framework/Versions/A/TCC";
const PREFLIGHT_SYMBOL: &CStr = c"TCCAccessPreflight";
const REQUEST_SYMBOL: &CStr = c"TCCAccessRequest";
const AUDIO_CAPTURE_SERVICE: &str = "kTCCServiceAudioCapture";
const PREFLIGHT_GRANTED: c_int = 0;
const PREFLIGHT_DENIED: c_int = 1;

const KNOWN_UNKNOWN: u8 = 0;
const KNOWN_GRANTED: u8 = 1;
const KNOWN_DENIED: u8 = 2;

type PreflightFn = unsafe extern "C" fn(*const c_void, *const c_void) -> c_int;
type RequestFn = unsafe extern "C" fn(*const c_void, *const c_void, *const c_void);

static LAST_KNOWN_AUDIO_CAPTURE: AtomicU8 = AtomicU8::new(KNOWN_UNKNOWN);

struct TccSymbols {
    preflight: Option<PreflightFn>,
    request: Option<RequestFn>,
}

fn resolve_symbol(handle: *mut c_void, name: &CStr) -> *mut c_void {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    unsafe { libc::dlsym(handle, name.as_ptr() as *const c_char) }
}

fn symbols() -> &'static TccSymbols {
    static SYMBOLS: OnceLock<TccSymbols> = OnceLock::new();
    SYMBOLS.get_or_init(|| {
        let handle = unsafe { libc::dlopen(TCC_FRAMEWORK_PATH.as_ptr(), libc::RTLD_NOW) };
        let preflight = resolve_symbol(handle, PREFLIGHT_SYMBOL);
        let request = resolve_symbol(handle, REQUEST_SYMBOL);
        TccSymbols {
            preflight: (!preflight.is_null())
                .then(|| unsafe { std::mem::transmute::<*mut c_void, PreflightFn>(preflight) }),
            request: (!request.is_null())
                .then(|| unsafe { std::mem::transmute::<*mut c_void, RequestFn>(request) }),
        }
    })
}

pub fn record_audio_capture_result(granted: bool) {
    let value = if granted { KNOWN_GRANTED } else { KNOWN_DENIED };
    LAST_KNOWN_AUDIO_CAPTURE.store(value, Ordering::Relaxed);
}

fn last_known_audio_capture() -> &'static str {
    match LAST_KNOWN_AUDIO_CAPTURE.load(Ordering::Relaxed) {
        KNOWN_GRANTED => GRANTED,
        KNOWN_DENIED => DENIED,
        _ => UNDETERMINED,
    }
}

pub fn audio_capture_status() -> &'static str {
    let Some(preflight) = symbols().preflight else {
        return last_known_audio_capture();
    };
    let service = NSString::from_str(AUDIO_CAPTURE_SERVICE);
    let result = unsafe {
        preflight(
            &*service as *const NSString as *const c_void,
            std::ptr::null(),
        )
    };
    match result {
        PREFLIGHT_GRANTED => GRANTED,
        PREFLIGHT_DENIED => DENIED,
        _ => last_known_audio_capture(),
    }
}

pub fn is_audio_capture_denied() -> bool {
    audio_capture_status() == DENIED
}

pub fn begin_audio_capture_request() -> Option<oneshot::Receiver<bool>> {
    let request = symbols().request?;
    let (sender, receiver) = oneshot::channel();
    let sender = Mutex::new(Some(sender));
    let callback = RcBlock::new(move |granted: u8| {
        let pending = sender.lock().ok().and_then(|mut slot| slot.take());
        if let Some(pending) = pending {
            let _ = pending.send(granted != 0);
        }
    });
    let service = NSString::from_str(AUDIO_CAPTURE_SERVICE);
    unsafe {
        request(
            &*service as *const NSString as *const c_void,
            std::ptr::null(),
            &*callback as *const _ as *const c_void,
        );
    }
    Some(receiver)
}
