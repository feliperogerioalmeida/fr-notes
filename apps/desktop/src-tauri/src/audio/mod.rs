use std::sync::Arc;

pub mod echo;
pub mod microphone;
pub mod pcm;
#[cfg(target_os = "macos")]
pub mod process_tap;
#[cfg(target_os = "macos")]
pub mod screen_capture;
#[cfg(target_os = "macos")]
pub mod system_audio;

pub type ErrorReporter = Arc<dyn Fn(String) + Send + Sync>;
