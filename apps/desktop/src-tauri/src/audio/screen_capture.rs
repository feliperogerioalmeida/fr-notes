use screencapturekit::cm::{CMSampleBuffer, CMTime};
use screencapturekit::prelude::*;
use tokio::sync::mpsc::UnboundedSender;

use super::pcm::{average_channels, bytes_to_f32, downmix_to_mono};

pub const SYSTEM_SAMPLE_RATE: u32 = 48_000;
const SYSTEM_CHANNELS: i32 = 1;
const PLACEHOLDER_VIDEO_SIZE: u32 = 2;
const PLACEHOLDER_FRAME_INTERVAL_SECONDS: i64 = 1;

pub struct ScreenCaptureAudio {
    stream: SCStream,
}

impl ScreenCaptureAudio {
    pub fn stop(self) {
        let _ = self.stream.stop_capture();
    }
}

struct AudioOutput {
    audio_tx: UnboundedSender<Vec<f32>>,
}

struct IgnoredVideoOutput;

impl SCStreamOutputTrait for AudioOutput {
    fn did_output_sample_buffer(&self, sample: CMSampleBuffer, output_type: SCStreamOutputType) {
        if !matches!(output_type, SCStreamOutputType::Audio) {
            return;
        }
        let Some(samples) = extract_mono_samples(&sample) else {
            return;
        };
        let _ = self.audio_tx.send(samples);
    }
}

impl SCStreamOutputTrait for IgnoredVideoOutput {
    fn did_output_sample_buffer(&self, _sample: CMSampleBuffer, _output_type: SCStreamOutputType) {}
}

pub fn start_screen_capture_audio(
    audio_tx: UnboundedSender<Vec<f32>>,
) -> Result<(ScreenCaptureAudio, u32), String> {
    let content = SCShareableContent::get()
        .map_err(|error| format!("shareable_content_unavailable: {error}"))?;
    let display = content
        .displays()
        .into_iter()
        .next()
        .ok_or_else(|| "no_display_available".to_string())?;
    let filter = SCContentFilter::create()
        .with_display(&display)
        .with_excluding_windows(&[])
        .build()
        .map_err(|error| error.to_string())?;
    let mut stream =
        SCStream::new(&filter, &build_configuration()).map_err(|error| error.to_string())?;
    stream
        .add_output_handler(IgnoredVideoOutput, SCStreamOutputType::Screen)
        .map_err(|error| error.to_string())?;
    stream
        .add_output_handler(AudioOutput { audio_tx }, SCStreamOutputType::Audio)
        .map_err(|error| error.to_string())?;
    stream.start_capture().map_err(|error| error.to_string())?;
    Ok((ScreenCaptureAudio { stream }, SYSTEM_SAMPLE_RATE))
}

fn build_configuration() -> SCStreamConfiguration {
    SCStreamConfiguration::new()
        .with_width(PLACEHOLDER_VIDEO_SIZE)
        .with_height(PLACEHOLDER_VIDEO_SIZE)
        .with_minimum_frame_interval(&CMTime::new(PLACEHOLDER_FRAME_INTERVAL_SECONDS, 1))
        .with_captures_audio(true)
        .with_sample_rate(SYSTEM_SAMPLE_RATE as i32)
        .with_channel_count(SYSTEM_CHANNELS)
        .with_excludes_current_process_audio(true)
}

fn extract_mono_samples(sample: &CMSampleBuffer) -> Option<Vec<f32>> {
    let list = sample.audio_buffer_list().ok()?;
    let buffers: Vec<(usize, Vec<f32>)> = (0..list.num_buffers())
        .filter_map(|index| list.get(index))
        .map(|buffer| (buffer.number_channels as usize, bytes_to_f32(buffer.data())))
        .collect();
    if buffers.is_empty() {
        return None;
    }
    if let [(channels, samples)] = buffers.as_slice() {
        return Some(downmix_to_mono(samples, *channels));
    }
    let channels: Vec<Vec<f32>> = buffers.into_iter().map(|(_, samples)| samples).collect();
    Some(average_channels(&channels))
}
