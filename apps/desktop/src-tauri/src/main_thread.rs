use tauri::AppHandle;
use tokio::sync::oneshot;

pub async fn run_on_main<T, F>(app: &AppHandle, task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> T + Send + 'static,
{
    let (sender, receiver) = oneshot::channel();
    app.run_on_main_thread(move || {
        let _ = sender.send(task());
    })
    .map_err(|error| error.to_string())?;
    receiver
        .await
        .map_err(|_| "main_thread_task_dropped".to_string())
}
