use std::fs::{self, OpenOptions};
use std::io::{Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, SystemTime};

use serde::Serialize;
use tauri::{AppHandle, Manager};

const RECORDINGS_DIR: &str = "recordings";
const AFCONVERT: &str = "/usr/bin/afconvert";
const AAC_BIT_RATE: &str = "32000";
const WAV_EXTENSION: &str = "wav";
const M4A_EXTENSION: &str = "m4a";
const WAV_HEADER_BYTES: u64 = 44;
const RIFF_SIZE_OFFSET: u64 = 4;
const DATA_SIZE_OFFSET: u64 = 40;
const RIFF_PREFIX_BYTES: u64 = 8;
const SECONDS_PER_DAY: u64 = 24 * 60 * 60;

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RecordingFile {
    pub path: String,
    pub source: String,
    pub started_at_ms: u64,
}

pub fn recordings_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join(RECORDINGS_DIR))
        .map_err(|error| error.to_string())
}

pub fn sanitize_note_id(note_id: &str) -> String {
    note_id
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || *character == '-')
        .collect()
}

pub fn note_dir(app: &AppHandle, note_id: &str) -> Result<PathBuf, String> {
    Ok(recordings_root(app)?.join(sanitize_note_id(note_id)))
}

pub fn new_recording_path(
    app: &AppHandle,
    note_id: &str,
    started_at_ms: u64,
    source: &str,
) -> Result<PathBuf, String> {
    let dir = note_dir(app, note_id)?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join(format!("{started_at_ms}-{source}.{WAV_EXTENSION}")))
}

pub fn parse_file_name(path: &Path) -> Option<RecordingFile> {
    let stem = path.file_stem()?.to_str()?;
    let (started, source) = stem.split_once('-')?;
    Some(RecordingFile {
        path: path.to_string_lossy().into_owned(),
        source: source.to_string(),
        started_at_ms: started.parse().ok()?,
    })
}

pub fn convert_to_m4a(wav: &Path) -> Result<PathBuf, String> {
    let m4a = wav.with_extension(M4A_EXTENSION);
    let status = Command::new(AFCONVERT)
        .args(["-f", "m4af", "-d", "aac", "-b", AAC_BIT_RATE])
        .arg(wav)
        .arg(&m4a)
        .status()
        .map_err(|error| error.to_string())?;
    if !status.success() {
        return Err(format!("afconvert falhou para {}", wav.display()));
    }
    fs::remove_file(wav).map_err(|error| error.to_string())?;
    Ok(m4a)
}

pub fn repair_wav_header(path: &Path) -> Result<(), String> {
    let length = fs::metadata(path).map_err(|error| error.to_string())?.len();
    if length < WAV_HEADER_BYTES {
        return Err("arquivo WAV incompleto".into());
    }
    let mut file = OpenOptions::new()
        .write(true)
        .open(path)
        .map_err(|error| error.to_string())?;
    let mut write_u32 = |offset: u64, value: u64| -> Result<(), String> {
        file.seek(SeekFrom::Start(offset))
            .map_err(|error| error.to_string())?;
        file.write_all(&(value as u32).to_le_bytes())
            .map_err(|error| error.to_string())
    };
    write_u32(RIFF_SIZE_OFFSET, length - RIFF_PREFIX_BYTES)?;
    write_u32(DATA_SIZE_OFFSET, length - WAV_HEADER_BYTES)
}

fn files_with_extension(dir: &Path, extension: &str) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };
    entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|ext| ext == extension))
        .collect()
}

fn note_dirs(root: &Path) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(root) else {
        return Vec::new();
    };
    entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .collect()
}

pub fn recover_leftovers(app: &AppHandle) {
    let Ok(root) = recordings_root(app) else {
        return;
    };
    for dir in note_dirs(&root) {
        for wav in files_with_extension(&dir, WAV_EXTENSION) {
            if repair_wav_header(&wav).is_ok() {
                let _ = convert_to_m4a(&wav);
            }
        }
    }
}

pub fn list_recordings(app: &AppHandle, note_id: &str) -> Result<Vec<RecordingFile>, String> {
    let dir = note_dir(app, note_id)?;
    let mut files: Vec<RecordingFile> = files_with_extension(&dir, M4A_EXTENSION)
        .iter()
        .chain(files_with_extension(&dir, WAV_EXTENSION).iter())
        .filter_map(|path| parse_file_name(path))
        .collect();
    files.sort_by_key(|file| (file.started_at_ms, file.source.clone()));
    Ok(files)
}

pub fn cleanup_older_than(app: &AppHandle, retention_days: u64) -> Result<usize, String> {
    let root = recordings_root(app)?;
    let max_age = Duration::from_secs(retention_days * SECONDS_PER_DAY);
    let now = SystemTime::now();
    let mut removed = 0;
    for dir in note_dirs(&root) {
        for file in files_with_extension(&dir, M4A_EXTENSION) {
            let expired = fs::metadata(&file)
                .and_then(|metadata| metadata.modified())
                .ok()
                .and_then(|modified| now.duration_since(modified).ok())
                .is_some_and(|age| age > max_age);
            if expired && fs::remove_file(&file).is_ok() {
                removed += 1;
            }
        }
        let _ = fs::remove_dir(&dir);
    }
    Ok(removed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_start_time_and_source_from_file_names() {
        let parsed = parse_file_name(Path::new("/x/1794365416848-system.m4a")).unwrap();
        assert_eq!(parsed.started_at_ms, 1_794_365_416_848);
        assert_eq!(parsed.source, "system");
        assert!(parse_file_name(Path::new("/x/notes.m4a")).is_none());
    }

    #[test]
    fn repairs_the_sizes_of_an_interrupted_wav() {
        let path = std::env::temp_dir().join(format!("fr-notes-repair-{}.wav", std::process::id()));
        let writer =
            crate::recordings::writer::AudioFileWriter::create(path.clone(), 16_000).unwrap();
        writer.write(&[0.1; 1_000]);
        drop(writer);
        let mut file = OpenOptions::new().write(true).open(&path).unwrap();
        file.seek(SeekFrom::Start(DATA_SIZE_OFFSET)).unwrap();
        file.write_all(&0u32.to_le_bytes()).unwrap();
        repair_wav_header(&path).unwrap();
        assert_eq!(hound::WavReader::open(&path).unwrap().len(), 1_000);
        let _ = fs::remove_file(path);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn converts_a_wav_recording_to_aac() {
        let path =
            std::env::temp_dir().join(format!("fr-notes-convert-{}.wav", std::process::id()));
        let writer =
            crate::recordings::writer::AudioFileWriter::create(path.clone(), 16_000).unwrap();
        let tone: Vec<f32> = (0..16_000)
            .map(|index| ((index as f32) * 0.05).sin() * 0.3)
            .collect();
        writer.write(&tone);
        let wav = writer.finish();
        let m4a = convert_to_m4a(&wav).unwrap();
        assert!(!wav.exists());
        assert!(fs::metadata(&m4a).unwrap().len() > 0);
        assert_eq!(
            parse_file_name(Path::new("/x/1-microphone.m4a"))
                .unwrap()
                .source,
            "microphone"
        );
        let _ = fs::remove_file(m4a);
    }
}
