const I16_SCALE: f32 = 32767.0;

pub fn downmix_to_mono(interleaved: &[f32], channels: usize) -> Vec<f32> {
    if channels <= 1 {
        return interleaved.to_vec();
    }
    interleaved
        .chunks_exact(channels)
        .map(|frame| frame.iter().sum::<f32>() / channels as f32)
        .collect()
}

pub fn average_channels(channels: &[Vec<f32>]) -> Vec<f32> {
    let Some(first) = channels.first() else {
        return Vec::new();
    };
    if channels.len() == 1 {
        return first.clone();
    }
    let frames = channels.iter().map(Vec::len).min().unwrap_or(0);
    (0..frames)
        .map(|index| {
            channels.iter().map(|channel| channel[index]).sum::<f32>() / channels.len() as f32
        })
        .collect()
}

pub fn to_i16_le_bytes(samples: &[f32]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(samples.len() * 2);
    for sample in samples {
        let clamped = sample.clamp(-1.0, 1.0);
        let value = (clamped * I16_SCALE) as i16;
        bytes.extend_from_slice(&value.to_le_bytes());
    }
    bytes
}

pub fn bytes_to_f32(bytes: &[u8]) -> Vec<f32> {
    bytes
        .chunks_exact(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect()
}

pub struct LinearResampler {
    step: f64,
    position: f64,
    previous: f32,
    passthrough: bool,
}

impl LinearResampler {
    pub fn new(input_rate: u32, output_rate: u32) -> Self {
        Self {
            step: f64::from(input_rate) / f64::from(output_rate.max(1)),
            position: 0.0,
            previous: 0.0,
            passthrough: input_rate == output_rate,
        }
    }

    pub fn process(&mut self, input: &[f32]) -> Vec<f32> {
        if self.passthrough || input.is_empty() {
            return input.to_vec();
        }
        let last_index = (input.len() - 1) as f64;
        let mut output = Vec::with_capacity((input.len() as f64 / self.step).ceil() as usize + 1);
        while self.position <= last_index {
            output.push(self.interpolate(input));
            self.position += self.step;
        }
        self.position -= input.len() as f64;
        self.previous = input[input.len() - 1];
        output
    }

    fn sample_at(&self, input: &[f32], index: isize) -> f32 {
        if index < 0 {
            return self.previous;
        }
        input[index as usize]
    }

    fn interpolate(&self, input: &[f32]) -> f32 {
        let base = self.position.floor();
        let fraction = (self.position - base) as f32;
        let index = base as isize;
        let current = self.sample_at(input, index);
        if fraction == 0.0 {
            return current;
        }
        let next = self.sample_at(input, index + 1);
        current + (next - current) * fraction
    }
}

pub fn rms_level(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum: f32 = samples.iter().map(|sample| sample * sample).sum();
    (sum / samples.len() as f32).sqrt().clamp(0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn downmixes_stereo_frames() {
        assert_eq!(downmix_to_mono(&[1.0, 0.0, 0.5, 0.5], 2), vec![0.5, 0.5]);
    }

    #[test]
    fn converts_to_little_endian_i16() {
        assert_eq!(to_i16_le_bytes(&[1.0, -1.0]), vec![0xFF, 0x7F, 0x01, 0x80]);
    }

    #[test]
    fn resamples_to_expected_length() {
        let mut resampler = LinearResampler::new(44_100, 48_000);
        let total: usize = (0..100)
            .map(|_| resampler.process(&vec![0.25; 441]).len())
            .sum();
        assert!((total as i64 - 48_000).abs() <= 2, "got {total}");
    }

    #[test]
    fn keeps_constant_signal_constant_across_chunks() {
        let mut resampler = LinearResampler::new(32_000, 48_000);
        let first = resampler.process(&[0.5; 320]);
        let second = resampler.process(&[0.5; 320]);
        assert!(second.iter().all(|sample| (sample - 0.5).abs() < 1e-6));
        assert!(first
            .iter()
            .skip(1)
            .all(|sample| (sample - 0.5).abs() < 1e-6));
    }

    #[test]
    fn passes_through_matching_rates() {
        let mut resampler = LinearResampler::new(48_000, 48_000);
        assert_eq!(resampler.process(&[0.1, 0.2, 0.3]), vec![0.1, 0.2, 0.3]);
    }

    #[test]
    fn interpolates_between_chunks() {
        let mut resampler = LinearResampler::new(2, 4);
        let output = [resampler.process(&[0.0, 1.0]), resampler.process(&[2.0])].concat();
        assert_eq!(output, vec![0.0, 0.5, 1.0, 1.5, 2.0]);
    }

    #[test]
    fn computes_rms() {
        assert!((rms_level(&[0.5, -0.5]) - 0.5).abs() < f32::EPSILON);
        assert_eq!(rms_level(&[]), 0.0);
    }
}
