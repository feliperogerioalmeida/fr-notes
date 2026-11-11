use std::fs::File;
use std::io::BufWriter;
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver, RecvTimeoutError, Sender};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

use hound::{SampleFormat, WavSpec, WavWriter};

const FLUSH_INTERVAL: Duration = Duration::from_secs(5);

type FileWavWriter = WavWriter<BufWriter<File>>;

pub struct AudioFileWriter {
    sender: Option<Sender<Vec<f32>>>,
    thread: Option<JoinHandle<()>>,
    path: PathBuf,
}

impl AudioFileWriter {
    pub fn create(path: PathBuf, sample_rate: u32) -> Result<Self, String> {
        let spec = WavSpec {
            channels: 1,
            sample_rate,
            bits_per_sample: 16,
            sample_format: SampleFormat::Int,
        };
        let writer = WavWriter::create(&path, spec).map_err(|error| error.to_string())?;
        let (sender, receiver) = channel();
        let thread = std::thread::spawn(move || write_loop(writer, receiver));
        Ok(Self {
            sender: Some(sender),
            thread: Some(thread),
            path,
        })
    }

    pub fn write(&self, samples: &[f32]) {
        if let Some(sender) = &self.sender {
            let _ = sender.send(samples.to_vec());
        }
    }

    pub fn finish(mut self) -> PathBuf {
        self.close();
        self.path.clone()
    }

    fn close(&mut self) {
        self.sender.take();
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

impl Drop for AudioFileWriter {
    fn drop(&mut self) {
        self.close();
    }
}

pub fn to_i16_sample(sample: f32) -> i16 {
    (sample.clamp(-1.0, 1.0) * f32::from(i16::MAX)) as i16
}

fn write_loop(mut writer: FileWavWriter, receiver: Receiver<Vec<f32>>) {
    let mut last_flush = Instant::now();
    loop {
        match receiver.recv_timeout(FLUSH_INTERVAL) {
            Ok(samples) => {
                for sample in samples {
                    let _ = writer.write_sample(to_i16_sample(sample));
                }
            }
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => break,
        }
        if last_flush.elapsed() >= FLUSH_INTERVAL {
            let _ = writer.flush();
            last_flush = Instant::now();
        }
    }
    let _ = writer.finalize();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_float_samples_to_clamped_pcm() {
        assert_eq!(to_i16_sample(0.0), 0);
        assert_eq!(to_i16_sample(1.5), i16::MAX);
        assert_eq!(to_i16_sample(-1.5), -i16::MAX);
    }

    #[test]
    fn writes_a_readable_wav_file() {
        let path = std::env::temp_dir().join(format!("fr-notes-{}.wav", std::process::id()));
        let writer = AudioFileWriter::create(path.clone(), 16_000).unwrap();
        writer.write(&[0.0, 0.5, -0.5]);
        let written = writer.finish();
        let reader = hound::WavReader::open(&written).unwrap();
        assert_eq!(reader.spec().sample_rate, 16_000);
        assert_eq!(reader.len(), 3);
        let _ = std::fs::remove_file(written);
    }
}
