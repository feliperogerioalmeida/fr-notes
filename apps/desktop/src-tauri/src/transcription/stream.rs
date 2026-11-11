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
const RECONNECT_BASE_DELAY: Duration = Duration::from_secs(2);
const RECONNECT_MAX_DELAY: Duration = Duration::from_secs(30);
const MAX_BACKLOG_SECONDS: u32 = 600;
const BYTES_PER_SAMPLE: u64 = 2;
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

pub(crate) struct AudioClock {
    started_at_ms: u64,
    sample_rate: u32,
    consumed_samples: u64,
}

impl AudioClock {
    pub(crate) fn new(started_at_ms: u64, sample_rate: u32) -> Self {
        Self {
            started_at_ms,
            sample_rate: sample_rate.max(1),
            consumed_samples: 0,
        }
    }

    pub(crate) fn advance(&mut self, samples: u64) {
        self.consumed_samples += samples;
    }

    pub(crate) fn now_ms(&self) -> u64 {
        self.started_at_ms + self.consumed_samples * 1000 / u64::from(self.sample_rate)
    }
}

pub(crate) fn reconnect_delay(failures: u32) -> Duration {
    let factor = 2u32.saturating_pow(failures.saturating_sub(1).min(5));
    (RECONNECT_BASE_DELAY * factor).min(RECONNECT_MAX_DELAY)
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

    pub(crate) fn drop_oldest_beyond(&mut self, max_samples: usize) -> usize {
        let excess = self.pending.len().saturating_sub(max_samples);
        self.pending.drain(..excess);
        excess
    }

    pub(crate) fn take_remaining(&mut self) -> Option<Vec<u8>> {
        if self.pending.is_empty() {
            return None;
        }
        let chunk = std::mem::take(&mut self.pending);
        Some(to_i16_le_bytes(&chunk))
    }
}

pub async fn run_source_stream(
    stream: SourceStream,
    mut audio_rx: UnboundedReceiver<Vec<f32>>,
    mut stop_rx: watch::Receiver<bool>,
) {
    let mut buffer = AudioBuffer::new(stream.config.sample_rate);
    let mut clock = AudioClock::new(now_epoch_ms(), stream.config.sample_rate);
    let mut failures: u32 = 0;
    while !*stop_rx.borrow() {
        match connect_deepgram(&stream.config).await {
            Ok(socket) => {
                failures = 0;
                let mut io = StreamIo {
                    buffer: &mut buffer,
                    clock: &mut clock,
                    audio_rx: &mut audio_rx,
                    stop_rx: &mut stop_rx,
                };
                if matches!(
                    pump_socket(&stream, socket, &mut io).await,
                    PumpOutcome::Stopped
                ) {
                    return;
                }
            }
            Err(error) => {
                if failures == 0 {
                    emit_recording_error(
                        &stream.app,
                        "deepgram",
                        format!("{}: {error}", stream.source.as_str()),
                    );
                }
                failures += 1;
            }
        }
        let mut io = StreamIo {
            buffer: &mut buffer,
            clock: &mut clock,
            audio_rx: &mut audio_rx,
            stop_rx: &mut stop_rx,
        };
        if matches!(
            buffer_while_waiting(&stream, &mut io, reconnect_delay(failures.max(1))).await,
            PumpOutcome::Stopped
        ) {
            return;
        }
    }
}

struct StreamIo<'a> {
    buffer: &'a mut AudioBuffer,
    clock: &'a mut AudioClock,
    audio_rx: &'a mut UnboundedReceiver<Vec<f32>>,
    stop_rx: &'a mut watch::Receiver<bool>,
}

fn receive_samples(stream: &SourceStream, io: &mut StreamIo<'_>, samples: &[f32]) {
    stream
        .level
        .store(rms_level(samples).to_bits(), Ordering::Relaxed);
    io.buffer.push(samples);
    let max_samples = (stream.config.sample_rate * MAX_BACKLOG_SECONDS) as usize;
    let dropped = io.buffer.drop_oldest_beyond(max_samples);
    io.clock.advance(dropped as u64);
}

async fn buffer_while_waiting(
    stream: &SourceStream,
    io: &mut StreamIo<'_>,
    delay: Duration,
) -> PumpOutcome {
    let wait = tokio::time::sleep(delay);
    tokio::pin!(wait);
    loop {
        tokio::select! {
            received = io.audio_rx.recv() => {
                let Some(samples) = received else { return PumpOutcome::Stopped };
                receive_samples(stream, io, &samples);
            }
            _ = io.stop_rx.changed() => return PumpOutcome::Stopped,
            _ = &mut wait => return PumpOutcome::Disconnected,
        }
    }
}

async fn pump_socket(
    stream: &SourceStream,
    socket: DeepgramSocket,
    io: &mut StreamIo<'_>,
) -> PumpOutcome {
    let (mut writer, reader) = socket.split();
    let mut reader_task = spawn_result_reader(stream, reader, io.clock.now_ms());
    let mut keep_alive = tokio::time::interval(KEEP_ALIVE_INTERVAL);
    let mut last_sent = Instant::now();
    if send_ready_chunks(&mut writer, io, &mut last_sent)
        .await
        .is_err()
    {
        reader_task.abort();
        return PumpOutcome::Disconnected;
    }
    loop {
        tokio::select! {
            received = io.audio_rx.recv() => {
                let Some(samples) = received else {
                    return finish_socket(&mut writer, io.buffer, reader_task).await;
                };
                receive_samples(stream, io, &samples);
                if send_ready_chunks(&mut writer, io, &mut last_sent).await.is_err() {
                    reader_task.abort();
                    return PumpOutcome::Disconnected;
                }
            }
            _ = io.stop_rx.changed() => {
                return finish_socket(&mut writer, io.buffer, reader_task).await;
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
    io: &mut StreamIo<'_>,
    last_sent: &mut Instant,
) -> Result<(), String> {
    while let Some(chunk) = io.buffer.take_chunk() {
        let samples = chunk.len() as u64 / BYTES_PER_SAMPLE;
        writer
            .send(Message::binary(chunk))
            .await
            .map_err(|error| error.to_string())?;
        io.clock.advance(samples);
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

fn spawn_result_reader(
    stream: &SourceStream,
    mut reader: SocketReader,
    connection_epoch_ms: u64,
) -> JoinHandle<()> {
    let app = stream.app.clone();
    let note_id = stream.note_id.clone();
    let source = stream.source;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn backs_off_exponentially_up_to_thirty_seconds() {
        assert_eq!(reconnect_delay(1), Duration::from_secs(2));
        assert_eq!(reconnect_delay(2), Duration::from_secs(4));
        assert_eq!(reconnect_delay(4), Duration::from_secs(16));
        assert_eq!(reconnect_delay(9), Duration::from_secs(30));
    }

    #[test]
    fn audio_clock_counts_time_from_samples_not_wall_clock() {
        let mut clock = AudioClock::new(1_000, 16_000);
        clock.advance(8_000);
        assert_eq!(clock.now_ms(), 1_500);
        clock.advance(16_000);
        assert_eq!(clock.now_ms(), 2_500);
    }

    #[test]
    fn caps_the_backlog_by_dropping_the_oldest_audio() {
        let mut buffer = AudioBuffer::new(10);
        buffer.push(&[0.1; 25]);
        assert_eq!(buffer.drop_oldest_beyond(20), 5);
        assert_eq!(buffer.drop_oldest_beyond(20), 0);
        assert!(buffer.take_chunk().is_some());
    }
}
