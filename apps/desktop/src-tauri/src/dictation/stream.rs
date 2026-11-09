use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc::UnboundedReceiver;
use tokio::sync::watch;
use tokio::task::JoinHandle;
use tokio_tungstenite::tungstenite::Message;

use super::transcript::DictationTranscript;
use crate::audio::pcm::rms_level;
use crate::events::{DictationPartialPayload, DICTATION_PARTIAL_EVENT};
use crate::transcription::deepgram::{
    connect_deepgram, parse_result, DeepgramConfig, DeepgramSocket, CLOSE_STREAM_MESSAGE,
};
use crate::transcription::stream::AudioBuffer;

const FINAL_RESULTS_TIMEOUT: Duration = Duration::from_millis(2500);
const CONNECTION_LOST_ERROR: &str = "deepgram_connection_lost";

type SocketWriter = SplitSink<DeepgramSocket, Message>;
type SocketReader = SplitStream<DeepgramSocket>;

#[derive(Clone, Default)]
pub struct DictationShared {
    pub transcript: Arc<Mutex<DictationTranscript>>,
    pub error: Arc<Mutex<Option<String>>>,
    pub level: Arc<AtomicU32>,
}

impl DictationShared {
    pub fn record_error(&self, message: impl Into<String>) {
        if let Ok(mut slot) = self.error.lock() {
            slot.get_or_insert(message.into());
        }
    }

    pub fn take_error(&self) -> Option<String> {
        self.error.lock().ok().and_then(|mut slot| slot.take())
    }

    pub fn final_text(&self) -> String {
        self.transcript
            .lock()
            .map(|transcript| transcript.final_text())
            .unwrap_or_default()
    }
}

pub struct DictationStream {
    pub app: AppHandle,
    pub config: DeepgramConfig,
    pub shared: DictationShared,
}

pub async fn run_dictation_stream(
    stream: DictationStream,
    mut audio_rx: UnboundedReceiver<Vec<f32>>,
    mut stop_rx: watch::Receiver<bool>,
) {
    let socket = match connect_deepgram(&stream.config).await {
        Ok(socket) => socket,
        Err(error) => {
            stream.shared.record_error(error);
            drain_audio(&stream.shared, &mut audio_rx, &mut stop_rx).await;
            return;
        }
    };
    let (mut writer, reader) = socket.split();
    let reader_task = spawn_reader(stream.app.clone(), stream.shared.clone(), reader);
    let mut buffer = AudioBuffer::new(stream.config.sample_rate);
    loop {
        tokio::select! {
            received = audio_rx.recv() => {
                let Some(samples) = received else { break };
                if send_samples(&mut writer, &mut buffer, &stream.shared, &samples).await.is_err() {
                    stream.shared.record_error(CONNECTION_LOST_ERROR);
                    reader_task.abort();
                    return;
                }
            }
            _ = stop_rx.changed() => break,
        }
    }
    while let Ok(samples) = audio_rx.try_recv() {
        buffer.push(&samples);
    }
    finish(writer, buffer, reader_task).await;
}

async fn send_samples(
    writer: &mut SocketWriter,
    buffer: &mut AudioBuffer,
    shared: &DictationShared,
    samples: &[f32],
) -> Result<(), String> {
    shared.level.store(rms_level(samples).to_bits(), Ordering::Relaxed);
    buffer.push(samples);
    while let Some(chunk) = buffer.take_chunk() {
        writer
            .send(Message::binary(chunk))
            .await
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

async fn finish(mut writer: SocketWriter, mut buffer: AudioBuffer, reader_task: JoinHandle<()>) {
    if let Some(remaining) = buffer.take_remaining() {
        let _ = writer.send(Message::binary(remaining)).await;
    }
    let _ = writer.send(Message::text(CLOSE_STREAM_MESSAGE.to_string())).await;
    let abort_handle = reader_task.abort_handle();
    if tokio::time::timeout(FINAL_RESULTS_TIMEOUT, reader_task).await.is_err() {
        abort_handle.abort();
    }
    let _ = writer.close().await;
}

async fn drain_audio(
    shared: &DictationShared,
    audio_rx: &mut UnboundedReceiver<Vec<f32>>,
    stop_rx: &mut watch::Receiver<bool>,
) {
    loop {
        tokio::select! {
            received = audio_rx.recv() => {
                let Some(samples) = received else { return };
                shared.level.store(rms_level(&samples).to_bits(), Ordering::Relaxed);
            }
            _ = stop_rx.changed() => return,
        }
    }
}

fn spawn_reader(app: AppHandle, shared: DictationShared, mut reader: SocketReader) -> JoinHandle<()> {
    tokio::spawn(async move {
        while let Some(Ok(message)) = reader.next().await {
            if let Message::Close(_) = message {
                break;
            }
            let Message::Text(text) = message else {
                continue;
            };
            let Some(result) = parse_result(text.as_str()) else {
                continue;
            };
            let running = apply_result(&shared, &result.transcript, result.is_final);
            let _ = app.emit(DICTATION_PARTIAL_EVENT, DictationPartialPayload { text: running });
        }
    })
}

fn apply_result(shared: &DictationShared, text: &str, is_final: bool) -> String {
    let Ok(mut transcript) = shared.transcript.lock() else {
        return String::new();
    };
    transcript.apply(text, is_final);
    transcript.running_text()
}
