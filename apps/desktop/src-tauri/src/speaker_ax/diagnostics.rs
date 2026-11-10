use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

use tauri::{AppHandle, Manager};

use super::tree::AxSnapshot;

const DIAGNOSTICS_DIR: &str = "speaker-diagnostics";
const WRITE_INTERVAL_MS: u64 = 15_000;
const MAX_FILES_PER_NOTE: usize = 120;
const RETENTION: Duration = Duration::from_secs(14 * 24 * 60 * 60);

pub fn diagnostics_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join(DIAGNOSTICS_DIR))
        .map_err(|error| error.to_string())
}

pub struct DiagnosticsWriter {
    dir: PathBuf,
    written: usize,
    last_written_ms: Option<u64>,
}

impl DiagnosticsWriter {
    pub fn create(app: &AppHandle, note_id: &str) -> Option<Self> {
        let root = diagnostics_root(app).ok()?;
        remove_expired(&root);
        let dir = root.join(sanitize(note_id));
        fs::create_dir_all(&dir).ok()?;
        Some(Self {
            dir,
            written: 0,
            last_written_ms: None,
        })
    }

    pub fn record(&mut self, snapshot: &AxSnapshot) {
        if !should_write(self.last_written_ms, snapshot.observed_at_ms, self.written) {
            return;
        }
        let path = self.dir.join(format!("{}.json", snapshot.observed_at_ms));
        let Ok(json) = serde_json::to_vec(snapshot) else {
            return;
        };
        if fs::write(path, json).is_ok() {
            self.written += 1;
            self.last_written_ms = Some(snapshot.observed_at_ms);
        }
    }
}

fn should_write(last_written_ms: Option<u64>, now_ms: u64, written: usize) -> bool {
    if written >= MAX_FILES_PER_NOTE {
        return false;
    }
    last_written_ms.is_none_or(|last| now_ms.saturating_sub(last) >= WRITE_INTERVAL_MS)
}

fn sanitize(note_id: &str) -> String {
    note_id
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || *character == '-')
        .collect()
}

fn remove_expired(root: &Path) {
    let Ok(entries) = fs::read_dir(root) else {
        return;
    };
    let now = SystemTime::now();
    for entry in entries.flatten() {
        let expired = entry
            .metadata()
            .and_then(|metadata| metadata.modified())
            .ok()
            .and_then(|modified| now.duration_since(modified).ok())
            .is_some_and(|age| age > RETENTION);
        if expired {
            let _ = fs::remove_dir_all(entry.path());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_first_snapshot_then_respects_interval_and_cap() {
        assert!(should_write(None, 1_000, 0));
        assert!(!should_write(Some(1_000), 1_000 + WRITE_INTERVAL_MS - 1, 1));
        assert!(should_write(Some(1_000), 1_000 + WRITE_INTERVAL_MS, 1));
        assert!(!should_write(None, 1_000, MAX_FILES_PER_NOTE));
    }

    #[test]
    fn keeps_only_safe_characters_in_folder_names() {
        assert_eq!(sanitize("8f0d704d-4fd1/../x"), "8f0d704d-4fd1x");
    }
}
