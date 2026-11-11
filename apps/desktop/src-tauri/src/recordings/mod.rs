pub mod files;
mod prerecorded;
pub mod writer;

use std::process::Command;

use tauri::AppHandle;
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver};

use crate::secrets::{read_secret, DEEPGRAM_API_KEY};
use crate::session::MISSING_DEEPGRAM_KEY_ERROR;
pub use files::RecordingFile;
pub use prerecorded::RetranscribedSegment;
use prerecorded::{transcribe_file, PrerecordedOptions};
use writer::AudioFileWriter;

const NO_RECORDINGS_ERROR: &str = "no_recordings";

pub fn tee_to_file(
    mut receiver: UnboundedReceiver<Vec<f32>>,
    writer: AudioFileWriter,
) -> UnboundedReceiver<Vec<f32>> {
    let (sender, forwarded) = unbounded_channel();
    tokio::spawn(async move {
        while let Some(samples) = receiver.recv().await {
            writer.write(&samples);
            if sender.send(samples).is_err() {
                break;
            }
        }
        let _ = tokio::task::spawn_blocking(move || {
            let path = writer.finish();
            files::convert_to_m4a(&path)
        })
        .await;
    });
    forwarded
}

pub struct RetranscribeRequest {
    pub note_id: String,
    pub language: String,
    pub keyterms: Vec<String>,
}

pub async fn retranscribe(
    app: &AppHandle,
    request: RetranscribeRequest,
) -> Result<Vec<RetranscribedSegment>, String> {
    let api_key =
        read_secret(DEEPGRAM_API_KEY)?.ok_or_else(|| MISSING_DEEPGRAM_KEY_ERROR.to_string())?;
    let recordings = files::list_recordings(app, &request.note_id)?;
    if recordings.is_empty() {
        return Err(NO_RECORDINGS_ERROR.into());
    }
    let client = reqwest::Client::new();
    let options = PrerecordedOptions {
        api_key: &api_key,
        language: &request.language,
        keyterms: &request.keyterms,
    };
    let mut segments = Vec::new();
    for recording in &recordings {
        segments.extend(transcribe_file(&client, recording, &options).await?);
    }
    segments.sort_by_key(|segment| segment.start_ms);
    Ok(segments)
}

pub fn reveal(app: &AppHandle, note_id: &str) -> Result<(), String> {
    let dir = files::note_dir(app, note_id)?;
    let target = if dir.exists() {
        dir
    } else {
        files::recordings_root(app)?
    };
    std::fs::create_dir_all(&target).map_err(|error| error.to_string())?;
    Command::new("open")
        .arg(&target)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}
