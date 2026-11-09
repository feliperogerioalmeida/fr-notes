use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc::UnboundedReceiver;
use tokio::sync::watch;
use tokio::task::JoinHandle;
use tokio_tungstenite::tungstenite::Message;

use super::deepgram::{
    connect_deepgram, parse_result, DeepgramConfig, DeepgramResult, DeepgramSocket,
    CLOSE_STREAM_MESSAGE, KEEP_ALIVE_MESSAGE,
};
use crate::audio::pcm::{rms_level, to_i16_le_bytes};
use crate::events::{
    emit_recording_error, AudioSource, TranscriptSegmentPayload, TRANSCRIPT_SEGMENT_EVENT,
};

const CHUNKS_PER_SECOND: u32 = 10;
const KEEP_ALIVE_INTERVAL: Duration = Duration::from_secs(5);
const FINAL_RESULTS_TIMEOUT: Duration = Duration::from_secs(4);
const RECONNECT_DELAY: Duration = Duration::from_secs(2);
const MAX_RECONNECT_ATTEMPTS: u32 = 5;
const MILLIS_PER_SECOND: f64 = 1000.0;

type SocketWriter = SplitSink<DeepgramSocket, Message>;
type SocketReader = SplitStream<DeepgramSocket>;

pub struct SourceStream {
    pub app: AppHandle,
    pub note_id: String,
    pub source: AudioSource,
    pub config: DeepgramConfig,
    pub level: Arc<AtomicU32>,
}

enum PumpOutcome {
    Stopped,
    Disconnected,
}

pub(crate) struct AudioBuffer {
    pending: Vec<f32>,
    chunk_size: usize,
}

impl AudioBuffer {
    pub(crate) fn new(sample_rate: u32) -> Self {
        let chunk_size = (sample_rate / CHUNKS_PER_SECOND).max(1) as usize;
        Self {
            pending: Vec::with_capacity(chunk_size * 2),
            chunk_size,
        }
    }

    pub(crate) fn push(&mut self, samples: &[f32]) {
        self.pending.extend_from_slice(samples);
    }

    pub(crate) fn take_chunk(&mut self) -> Option<Vec<u8>> {
        if self.pending.len() < self.chunk_size {
            return None;
        }
        let chunk: Vec<f32> = self.pending.drain(..self.chunk_size).collect();
        Some(to_i16_le_bytes(&chunk))
    }

    pub(crate) fn take_remaining(&mut self) -> Option<Vec<u8>> {
        if self.pending.is_empty() {
            return None;
        }
        let chunk: Vec<f32> = self.pending.drain(..).collect();
        Some(to_i16_le_bytes(&chunk))
    }
}

pub async fn run_source_stream(
    stream: SourceStream,
    mut audio_rx: UnboundedReceiver<Vec<f32>>,
    mut stop_rx: watch::Receiver<bool>,
) {
    let mut buffer = AudioBuffer::new(stream.config.sample_rate);
    let mut attempts = 0;
    while !*stop_rx.borrow() {
        let socket = match connect_deepgram(&stream.config).await {
            Ok(socket) => socket,
            Err(error) => {
                emit_recording_error(
                    &stream.app,
                    "deepgram",
                    format!("{}: {error}", stream.source.as_str()),
                );
                attempts += 1;
                if attempts > MAX_RECONNECT_ATTEMPTS {
                    drain_until_stopped(&stream, &mut audio_rx, &mut stop_rx).await;
                    return;
                }
                tokio::time::sleep(RECONNECT_DELAY).await;
                continue;
            }
        };
        attempts = 0;
        let outcome = pump_socket(&stream, socket, &mut buffer, &mut audio_rx, &mut stop_rx).await;
        if matches!(outcome, PumpOutcome::Stopped) {
            return;
        }
        tokio::time::sleep(RECONNECT_DELAY).await;
    }
}

async fn pump_socket(
    stream: &SourceStream,
    socket: DeepgramSocket,
    buffer: &mut AudioBuffer,
    audio_rx: &mut UnboundedReceiver<Vec<f32>>,
    stop_rx: &mut watch::Receiver<bool>,
) -> PumpOutcome {
    let (mut writer, reader) = socket.split();
    let mut reader_task = spawn_result_reader(stream, reader);
    let mut keep_alive = tokio::time::interval(KEEP_ALIVE_INTERVAL);
    let mut last_sent = Instant::now();
    loop {
        tokio::select! {
            received = audio_rx.recv() => {
                let Some(samples) = received else {
                    return finish_socket(&mut writer, buffer, reader_task).await;
                };
                stream.level.store(rms_level(&samples).to_bits(), Ordering::Relaxed);
                buffer.push(&samples);
                if send_ready_chunks(&mut writer, buffer, &mut last_sent).await.is_err() {
                    reader_task.abort();
                    return PumpOutcome::Disconnected;
                }
            }
            _ = stop_rx.changed() => {
                return finish_socket(&mut writer, buffer, reader_task).await;
            }
            _ = keep_alive.tick() => {
                if last_sent.elapsed() >= KEEP_ALIVE_INTERVAL && send_text(&mut writer, KEEP_ALIVE_MESSAGE).await.is_err() {
                    reader_task.abort();
                    return PumpOutcome::Disconnected;
                }
            }
            _ = &mut reader_task => {
                return PumpOutcome::Disconnected;
            }
        }
    }
}

async fn send_ready_chunks(
    writer: &mut SocketWriter,
    buffer: &mut AudioBuffer,
    last_sent: &mut Instant,
) -> Result<(), String> {
    while let Some(chunk) = buffer.take_chunk() {
        writer
            .send(Message::binary(chunk))
            .await
            .map_err(|error| error.to_string())?;
        *last_sent = Instant::now();
    }
    Ok(())
}

async fn send_text(writer: &mut SocketWriter, text: &str) -> Result<(), String> {
    writer
        .send(Message::text(text.to_string()))
        .await
        .map_err(|error| error.to_string())
}

async fn finish_socket(
    writer: &mut SocketWriter,
    buffer: &mut AudioBuffer,
    reader_task: JoinHandle<()>,
) -> PumpOutcome {
    if let Some(remaining) = buffer.take_remaining() {
        let _ = writer.send(Message::binary(remaining)).await;
    }
    let _ = send_text(writer, CLOSE_STREAM_MESSAGE).await;
    let abort_handle = reader_task.abort_handle();
    if tokio::time::timeout(FINAL_RESULTS_TIMEOUT, reader_task)
        .await
        .is_err()
    {
        abort_handle.abort();
    }
    let _ = writer.close().await;
    PumpOutcome::Stopped
}

async fn drain_until_stopped(
    stream: &SourceStream,
    audio_rx: &mut UnboundedReceiver<Vec<f32>>,
    stop_rx: &mut watch::Receiver<bool>,
) {
    loop {
        tokio::select! {
            received = audio_rx.recv() => {
                let Some(samples) = received else { return };
                stream.level.store(rms_level(&samples).to_bits(), Ordering::Relaxed);
            }
            _ = stop_rx.changed() => return,
        }
    }
}

fn spawn_result_reader(stream: &SourceStream, mut reader: SocketReader) -> JoinHandle<()> {
    let app = stream.app.clone();
    let note_id = stream.note_id.clone();
    let source = stream.source;
    let connection_epoch_ms = now_epoch_ms();
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
            let payload = build_segment_payload(&note_id, source, result, connection_epoch_ms);
            let _ = app.emit(TRANSCRIPT_SEGMENT_EVENT, payload);
        }
    })
}

fn build_segment_payload(
    note_id: &str,
    source: AudioSource,
    result: DeepgramResult,
    connection_epoch_ms: u64,
) -> TranscriptSegmentPayload {
    let start_ms = connection_epoch_ms + seconds_to_ms(result.start_seconds);
    let end_ms = start_ms + seconds_to_ms(result.duration_seconds);
    TranscriptSegmentPayload {
        note_id: note_id.to_string(),
        source: source.as_str(),
        speaker: result.speaker,
        text: result.transcript,
        is_final: result.is_final,
        start_ms,
        end_ms,
        segment_key: format!("{}:{start_ms}", source.as_str()),
    }
}

fn seconds_to_ms(seconds: f64) -> u64 {
    (seconds.max(0.0) * MILLIS_PER_SECOND).round() as u64
}

pub fn now_epoch_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}
