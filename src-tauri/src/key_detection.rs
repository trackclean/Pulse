use serde::Serialize;
use rustfft::{num_complex::Complex, FftPlanner};
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::default::{get_codecs, get_probe};
use std::path::Path;

#[derive(Serialize)]
pub struct KeyResult {
    pub key: Option<String>,
    pub confidence: f32,
}

const KEY_NAMES: [&str; 12] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAJOR_PROFILE: [f32; 12] = [7.23900502, 3.50351548, 5.84202368, 3.01233457, 6.04702059, 5.05474488, 3.20031380, 7.26475628, 3.42101930, 5.72775697, 3.07498851, 5.47243810];
const MINOR_PROFILE: [f32; 12] = [7.00255545, 3.14360970, 5.42611084, 6.40917339, 3.29163898, 5.04745880, 3.27205854, 6.80443504, 5.04745880, 3.37011695, 5.42611084, 3.81039284];

#[tauri::command]
pub async fn detect_key(path: String) -> Result<KeyResult, String> {
    tauri::async_runtime::spawn_blocking(move || detect_key_sync(&path))
        .await
        .map_err(|e| e.to_string())?
}

fn detect_key_sync(path: &str) -> Result<KeyResult, String> {
    let (mut samples, sample_rate) = decode_audio_mono(path)?;
    if sample_rate == 0 {
        return Err("Invalid sample rate".to_string());
    }

    let max_samples = sample_rate as usize * 60;
    if samples.len() > max_samples {
        samples.truncate(max_samples);
    }

    let target_rate = 11_025u32;
    let (mut downsampled, downsampled_rate) = decimate(&samples, sample_rate, target_rate);
    if downsampled.len() < 512 || downsampled.len() < (downsampled_rate as f32 * 0.1) as usize {
        return Ok(KeyResult { key: None, confidence: 0.0 });
    }

    let rms = center_and_rms(&mut downsampled);
    if !rms.is_finite() || rms < 0.001 {
        return Ok(KeyResult { key: None, confidence: 0.0 });
    }

    let frames = build_chroma_frames(&downsampled, downsampled_rate as f32);
    if frames.is_empty() {
        return Ok(KeyResult { key: None, confidence: 0.0 });
    }

    let segments = build_segments(&frames, 8);
    if segments.is_empty() {
        return Ok(KeyResult { key: None, confidence: 0.0 });
    }

    let best_window = select_best_window_chroma(&segments, 16);
    if best_window.iter().all(|&v| v == 0.0) {
        return Ok(KeyResult { key: None, confidence: 0.0 });
    }

    let major_profile = mean_center(&normalize_profile(&MAJOR_PROFILE));
    let minor_profile = mean_center(&normalize_profile(&MINOR_PROFILE));

    let window_scores = compute_key_scores(&best_window, &major_profile, &minor_profile);
    let votes = collect_segment_votes(&segments, &major_profile, &minor_profile);
    let total_segments = segments.len() as f32;

    let mut best_score = f32::NEG_INFINITY;
    let mut second_score = f32::NEG_INFINITY;
    let mut best_index = 0usize;

    for i in 0..24 {
        let vote_ratio = if total_segments > 0.0 {
            votes[i] as f32 / total_segments
        } else {
            0.0
        };
        let combined = 0.7 * window_scores[i] + 0.3 * vote_ratio;
        if combined > best_score {
            second_score = best_score;
            best_score = combined;
            best_index = i;
        } else if combined > second_score {
            second_score = combined;
        }
    }

    let key_index = best_index % 12;
    let is_minor = best_index >= 12;
    let key_name = KEY_NAMES.get(key_index).map(|v| v.to_string());
    let key = key_name.map(|k| if is_minor { format!("{k}m") } else { k });
    let confidence = (best_score - second_score).max(0.0);

    Ok(KeyResult { key, confidence })
}

fn decode_audio_mono(path: &str) -> Result<(Vec<f32>, u32), String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = Path::new(path).extension().and_then(|s| s.to_str()) {
        hint.with_extension(ext);
    }

    let probed = get_probe()
        .format(
            &hint,
            mss,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .map_err(|e| e.to_string())?;

    let mut format = probed.format;
    let track = format
        .default_track()
        .ok_or_else(|| "No supported audio tracks".to_string())?;

    let mut decoder = get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| e.to_string())?;

    let mut sample_rate = track.codec_params.sample_rate.unwrap_or(0);
    let mut samples: Vec<f32> = Vec::new();
    let mut max_samples: Option<usize> = None;

    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(SymphoniaError::IoError(_)) => break,
            Err(SymphoniaError::ResetRequired) => {
                decoder.reset();
                continue;
            }
            Err(e) => return Err(e.to_string()),
        };

        let decoded = match decoder.decode(&packet) {
            Ok(decoded) => decoded,
            Err(SymphoniaError::IoError(_)) => break,
            Err(SymphoniaError::DecodeError(_)) => continue,
            Err(e) => return Err(e.to_string()),
        };

        let spec = *decoded.spec();
        if sample_rate == 0 {
            sample_rate = spec.rate;
        }
        if sample_rate == 0 {
            return Err("Failed to determine sample rate".to_string());
        }

        if max_samples.is_none() {
            max_samples = Some(sample_rate as usize * 60);
        }

        let channels = spec.channels.count();
        let mut sample_buffer = SampleBuffer::<f32>::new(decoded.capacity() as u64, spec);
        sample_buffer.copy_interleaved_ref(decoded);
        if channels == 0 {
            return Err("No audio channels found".to_string());
        }

        let data = sample_buffer.samples();
        let frame_count = data.len() / channels;
        let remaining = max_samples.unwrap_or(0).saturating_sub(samples.len());
        if remaining == 0 {
            break;
        }

        let take_frames = remaining.min(frame_count);
        for frame in 0..take_frames {
            let mut sum = 0.0f32;
            for ch in 0..channels {
                sum += data[frame * channels + ch];
            }
            samples.push(sum / channels as f32);
        }

        if samples.len() >= max_samples.unwrap_or(0) {
            break;
        }
    }

    if sample_rate == 0 {
        return Err("No audio sample rate available".to_string());
    }
    if samples.is_empty() {
        return Err("No audio samples decoded".to_string());
    }

    Ok((samples, sample_rate))
}

fn decimate(samples: &[f32], sample_rate: u32, target_rate: u32) -> (Vec<f32>, u32) {
    if target_rate == 0 || sample_rate <= target_rate {
        return (samples.to_vec(), sample_rate);
    }

    let decimation = (sample_rate as f32 / target_rate as f32).floor() as usize;
    if decimation <= 1 {
        return (samples.to_vec(), sample_rate);
    }

    let out_len = samples.len() / decimation;
    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        let start = i * decimation;
        let end = (start + decimation).min(samples.len());
        if end <= start {
            break;
        }
        let mut acc = 0.0f32;
        for j in start..end {
            acc += samples[j];
        }
        out.push(acc / (end - start) as f32);
    }
    (out, sample_rate / decimation as u32)
}

fn center_and_rms(samples: &mut [f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let mean = samples.iter().sum::<f32>() / samples.len() as f32;
    let mut sum_sq = 0.0f32;
    for v in samples.iter_mut() {
        *v -= mean;
        sum_sq += *v * *v;
    }
    (sum_sq / samples.len() as f32).sqrt()
}

fn hann_window(len: usize) -> Vec<f32> {
    if len == 0 {
        return Vec::new();
    }
    let denom = (len - 1).max(1) as f32;
    let mut window = Vec::with_capacity(len);
    for n in 0..len {
        let w = 0.5 - 0.5 * (2.0 * std::f32::consts::PI * n as f32 / denom).cos();
        window.push(w);
    }
    window
}

fn build_chroma_frames(samples: &[f32], sample_rate: f32) -> Vec<[f32; 12]> {
    let fft_size = 16_384usize;
    let hop_size = fft_size / 4;
    if samples.is_empty() || sample_rate <= 0.0 || fft_size > samples.len() {
        return Vec::new();
    }

    let window = hann_window(fft_size);
    let mut planner = FftPlanner::<f32>::new();
    let fft = planner.plan_fft_forward(fft_size);
    let mut buffer = vec![Complex { re: 0.0, im: 0.0 }; fft_size];
    let mut frames: Vec<[f32; 12]> = Vec::new();

    let mut start = 0usize;
    while start + fft_size <= samples.len() {
        for i in 0..fft_size {
            buffer[i].re = samples[start + i] * window[i];
            buffer[i].im = 0.0;
        }

        fft.process(&mut buffer);

        let mut chroma = [0.0f32; 12];
        for bin in 1..(fft_size / 2) {
            let freq = bin as f32 * sample_rate / fft_size as f32;
            if freq < 65.41 || freq > 3951.0 {
                continue;
            }

            let coeff = buffer[bin];
            let magnitude = (coeff.re * coeff.re + coeff.im * coeff.im).sqrt();
            let midi = 69.0 + 12.0 * (freq / 440.0).log2();
            let weight = 1.0 / (1.0 + (midi - 48.0).abs() / 24.0);
            let energy = magnitude * weight;

            let lower = midi.floor() as i32;
            let upper = lower + 1;
            let frac_upper = midi - midi.floor();
            let frac_lower = 1.0 - frac_upper;
            let pc_lower = ((lower % 12) + 12) as usize % 12;
            let pc_upper = ((upper % 12) + 12) as usize % 12;

            chroma[pc_lower] += energy * frac_lower;
            chroma[pc_upper] += energy * frac_upper;
        }

        frames.push(chroma);
        start += hop_size;
    }

    frames
}

fn build_segments(frames: &[[f32; 12]], frames_per_segment: usize) -> Vec<[f32; 12]> {
    if frames_per_segment == 0 {
        return Vec::new();
    }

    let segment_count = frames.len() / frames_per_segment;
    let mut segments: Vec<[f32; 12]> = Vec::with_capacity(segment_count);

    for segment in 0..segment_count {
        let mut sum = [0.0f32; 12];
        let start = segment * frames_per_segment;
        let end = start + frames_per_segment;
        for frame in &frames[start..end] {
            for i in 0..12 {
                sum[i] += frame[i];
            }
        }

        let total: f32 = sum.iter().sum();
        if total > 0.0 {
            for v in &mut sum {
                *v /= total;
            }
        }
        segments.push(sum);
    }

    segments
}

fn select_best_window_chroma(segments: &[[f32; 12]], window_segments: usize) -> [f32; 12] {
    if segments.is_empty() {
        return [0.0f32; 12];
    }

    let window_size = window_segments.min(segments.len());
    let mut similarities: Vec<f32> = Vec::with_capacity(segments.len().saturating_sub(1));
    for i in 0..segments.len().saturating_sub(1) {
        similarities.push(cosine_similarity(&segments[i], &segments[i + 1]));
    }

    let mut best_score = f32::NEG_INFINITY;
    let mut best_start = 0usize;
    let last_start = segments.len().saturating_sub(window_size);
    for start in 0..=last_start {
        let mut sum = 0.0f32;
        let mut count = 0usize;
        let end = start + window_size;
        for idx in start..end.saturating_sub(1) {
            sum += similarities[idx];
            count += 1;
        }
        let avg = if count > 0 { sum / count as f32 } else { 0.0 };
        if avg > best_score {
            best_score = avg;
            best_start = start;
        }
    }

    let mut window_sum = [0.0f32; 12];
    for segment in &segments[best_start..(best_start + window_size)] {
        for i in 0..12 {
            window_sum[i] += segment[i];
        }
    }

    let total: f32 = window_sum.iter().sum();
    if total > 0.0 {
        for v in &mut window_sum {
            *v /= total;
        }
    }

    window_sum
}

fn cosine_similarity(a: &[f32; 12], b: &[f32; 12]) -> f32 {
    let mut dot = 0.0f32;
    let mut norm_a = 0.0f32;
    let mut norm_b = 0.0f32;
    for i in 0..12 {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }
    if norm_a <= 0.0 || norm_b <= 0.0 {
        0.0
    } else {
        dot / (norm_a.sqrt() * norm_b.sqrt())
    }
}

fn compute_key_scores(
    chroma: &[f32; 12],
    major_profile: &[f32],
    minor_profile: &[f32],
) -> [f32; 24] {
    let mut scores = [0.0f32; 24];
    for key in 0..12 {
        let mut rotated = [0.0f32; 12];
        for i in 0..12 {
            rotated[i] = chroma[(i + key) % 12];
        }

        scores[key] = pearson_correlation(&rotated, major_profile);
        scores[key + 12] = pearson_correlation(&rotated, minor_profile);
    }
    scores
}

fn collect_segment_votes(
    segments: &[[f32; 12]],
    major_profile: &[f32],
    minor_profile: &[f32],
) -> [usize; 24] {
    let mut votes = [0usize; 24];
    for segment in segments {
        let scores = compute_key_scores(segment, major_profile, minor_profile);
        let mut best_score = f32::NEG_INFINITY;
        let mut best_index = 0usize;
        for i in 0..24 {
            if scores[i] > best_score {
                best_score = scores[i];
                best_index = i;
            }
        }
        votes[best_index] += 1;
    }
    votes
}

fn normalize_profile(profile: &[f32]) -> Vec<f32> {
    let sum: f32 = profile.iter().sum();
    if sum == 0.0 {
        return profile.to_vec();
    }
    profile.iter().map(|v| v / sum).collect()
}

fn mean_center(profile: &[f32]) -> Vec<f32> {
    if profile.is_empty() {
        return Vec::new();
    }
    let mean = profile.iter().sum::<f32>() / profile.len() as f32;
    profile.iter().map(|v| v - mean).collect()
}

fn pearson_correlation(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let mean_a = a.iter().sum::<f32>() / a.len() as f32;
    let mean_b = b.iter().sum::<f32>() / b.len() as f32;
    let mut num = 0.0f32;
    let mut var_a = 0.0f32;
    let mut var_b = 0.0f32;
    for i in 0..a.len() {
        let da = a[i] - mean_a;
        let db = b[i] - mean_b;
        num += da * db;
        var_a += da * da;
        var_b += db * db;
    }
    let denom = (var_a * var_b).sqrt();
    if denom < 1e-10 {
        0.0
    } else {
        num / denom
    }
}
