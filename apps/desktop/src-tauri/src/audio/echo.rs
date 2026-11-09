use std::sync::mpsc::{self, Receiver, SyncSender, TrySendError};

use aec3::nodes::audio::AudioFormat;
use aec3::pipelines::linear::{self, LinearPipeline};
use tokio::sync::mpsc::UnboundedSender;

use super::pcm::LinearResampler;

pub const AEC_SAMPLE_RATE: u32 = 48_000;
const AEC_CHANNELS: u16 = 1;
const INPUT_QUEUE_CAPACITY: usize = 512;
const MAX_PENDING_SAMPLES: usize = AEC_SAMPLE_RATE as usize;

enum EchoInput {
    Capture(Vec<f32>),
    Reference(Vec<f32>),
}

#[derive(Clone)]
pub struct EchoInputSender {
    sender: SyncSender<EchoInput>,
}

impl EchoInputSender {
    pub fn send_capture(&self, samples: Vec<f32>) -> bool {
        self.try_send(EchoInput::Capture(samples))
    }

    pub fn send_reference(&self, samples: Vec<f32>) -> bool {
        self.try_send(EchoInput::Reference(samples))
    }

    fn try_send(&self, input: EchoInput) -> bool {
        !matches!(
            self.sender.try_send(input),
            Err(TrySendError::Disconnected(_))
        )
    }
}

pub struct EchoRates {
    pub capture: u32,
    pub reference: u32,
}

struct EchoWorker {
    pipeline: LinearPipeline,
    capture_resampler: LinearResampler,
    reference_resampler: LinearResampler,
    capture_pending: Vec<f32>,
    reference_pending: Vec<f32>,
    frame_size: usize,
    output: UnboundedSender<Vec<f32>>,
}

pub fn start_echo_canceller(
    rates: EchoRates,
    output: UnboundedSender<Vec<f32>>,
) -> Result<EchoInputSender, String> {
    let (sender, receiver) = mpsc::sync_channel(INPUT_QUEUE_CAPACITY);
    let (ready_tx, ready_rx) = mpsc::channel::<Result<(), String>>();
    std::thread::Builder::new()
        .name("fr-notes-echo-canceller".into())
        .spawn(move || run_worker(rates, output, receiver, ready_tx))
        .map_err(|error| error.to_string())?;
    ready_rx
        .recv()
        .map_err(|_| "echo_canceller_thread_failed".to_string())??;
    Ok(EchoInputSender { sender })
}

fn build_pipeline() -> Result<LinearPipeline, String> {
    let format = AudioFormat::ten_ms(AEC_SAMPLE_RATE, AEC_CHANNELS);
    linear::builder(format, format)
        .enable_gain_controller2(false)
        .enable_post_filter(false)
        .build()
        .map_err(|error| format!("echo_canceller_init_failed: {error:?}"))
}

fn run_worker(
    rates: EchoRates,
    output: UnboundedSender<Vec<f32>>,
    receiver: Receiver<EchoInput>,
    ready_tx: mpsc::Sender<Result<(), String>>,
) {
    let pipeline = match build_pipeline() {
        Ok(pipeline) => pipeline,
        Err(error) => {
            let _ = ready_tx.send(Err(error));
            return;
        }
    };
    let _ = ready_tx.send(Ok(()));
    let mut worker = EchoWorker::new(pipeline, rates, output);
    while let Ok(input) = receiver.recv() {
        worker.handle(input);
    }
}

fn trim_backlog(pending: &mut Vec<f32>) {
    if pending.len() > MAX_PENDING_SAMPLES {
        let excess = pending.len() - MAX_PENDING_SAMPLES;
        pending.drain(..excess);
    }
}

impl EchoWorker {
    fn new(pipeline: LinearPipeline, rates: EchoRates, output: UnboundedSender<Vec<f32>>) -> Self {
        Self {
            frame_size: pipeline.capture_format().sample_count(),
            pipeline,
            capture_resampler: LinearResampler::new(rates.capture, AEC_SAMPLE_RATE),
            reference_resampler: LinearResampler::new(rates.reference, AEC_SAMPLE_RATE),
            capture_pending: Vec::new(),
            reference_pending: Vec::new(),
            output,
        }
    }

    fn handle(&mut self, input: EchoInput) {
        match input {
            EchoInput::Reference(samples) => self.feed_reference(&samples),
            EchoInput::Capture(samples) => self.feed_capture(&samples),
        }
    }

    fn feed_reference(&mut self, samples: &[f32]) {
        let resampled = self.reference_resampler.process(samples);
        self.reference_pending.extend_from_slice(&resampled);
        trim_backlog(&mut self.reference_pending);
        while self.reference_pending.len() >= self.frame_size {
            let frame: Vec<f32> = self.reference_pending.drain(..self.frame_size).collect();
            let _ = self.pipeline.handle_render_frame(&frame);
        }
    }

    fn feed_capture(&mut self, samples: &[f32]) {
        let resampled = self.capture_resampler.process(samples);
        self.capture_pending.extend_from_slice(&resampled);
        trim_backlog(&mut self.capture_pending);
        let mut processed = Vec::with_capacity(self.capture_pending.len());
        while self.capture_pending.len() >= self.frame_size {
            let frame: Vec<f32> = self.capture_pending.drain(..self.frame_size).collect();
            processed.extend_from_slice(&self.cancel_echo(&frame));
        }
        if !processed.is_empty() {
            let _ = self.output.send(processed);
        }
    }

    fn cancel_echo(&mut self, frame: &[f32]) -> Vec<f32> {
        let mut output = vec![0.0; frame.len()];
        match self.pipeline.process_capture_frame(frame, &mut output) {
            Ok(true) => output,
            _ => frame.to_vec(),
        }
    }
}
