mod diagnostics;
mod tree;

use std::process::Command;
use std::time::Duration;

use serde::Deserialize;
use tauri::{AppHandle, Emitter};
use tokio::sync::{watch, Mutex};

use crate::accessibility::{self, ACCESSIBILITY_REQUIRED_ERROR};
use crate::events::SPEAKER_SNAPSHOT_EVENT;
use diagnostics::{diagnostics_root, DiagnosticsWriter};
use tree::{capture_app, WalkBudget};

const POLL_INTERVAL: Duration = Duration::from_millis(1500);
const WALK_BUDGET: WalkBudget = WalkBudget {
    max_nodes: 4000,
    max_depth: 64,
    max_duration: Duration::from_millis(700),
};

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StartSpeakerMonitorArgs {
    pub note_id: String,
    pub bundle_id: String,
    pub diagnostics: bool,
}

#[derive(Default)]
pub struct SpeakerMonitor {
    stop_tx: Mutex<Option<watch::Sender<bool>>>,
}

impl SpeakerMonitor {
    pub async fn start(
        &self,
        app: &AppHandle,
        args: StartSpeakerMonitorArgs,
    ) -> Result<(), String> {
        if !accessibility::is_trusted() {
            return Err(ACCESSIBILITY_REQUIRED_ERROR.into());
        }
        let mut current = self.stop_tx.lock().await;
        if let Some(previous) = current.take() {
            let _ = previous.send(true);
        }
        let (stop_tx, stop_rx) = watch::channel(false);
        tauri::async_runtime::spawn(run_monitor(app.clone(), args, stop_rx));
        *current = Some(stop_tx);
        Ok(())
    }

    pub async fn stop(&self) {
        if let Some(stop_tx) = self.stop_tx.lock().await.take() {
            let _ = stop_tx.send(true);
        }
    }
}

async fn run_monitor(
    app: AppHandle,
    args: StartSpeakerMonitorArgs,
    mut stop_rx: watch::Receiver<bool>,
) {
    let mut interval = tokio::time::interval(POLL_INTERVAL);
    let mut writer = args
        .diagnostics
        .then(|| DiagnosticsWriter::create(&app, &args.note_id))
        .flatten();
    loop {
        tokio::select! {
            _ = interval.tick() => {}
            _ = stop_rx.changed() => break,
        }
        let bundle_id = args.bundle_id.clone();
        let captured =
            tauri::async_runtime::spawn_blocking(move || capture_app(&bundle_id, WALK_BUDGET))
                .await;
        let Ok(Some(snapshot)) = captured else {
            continue;
        };
        if let Some(writer) = writer.as_mut() {
            writer.record(&snapshot);
        }
        let _ = app.emit(SPEAKER_SNAPSHOT_EVENT, &snapshot);
    }
}

pub fn reveal_diagnostics(app: &AppHandle) -> Result<(), String> {
    let root = diagnostics_root(app)?;
    std::fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    Command::new("open")
        .arg(&root)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}
