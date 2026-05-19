import { invoke } from '@tauri-apps/api/core';
import type { TrackType } from '@/types/audio';

// Shared AudioContext to avoid creating too many instances
let sharedAudioContext: AudioContext | null = null;

/**
 * Classify tracks in a batch.
 *   < 2 min → sample (BPM detection runs)
 *   2 min+  → stem   (BPM detection skipped)
 *
 * Also detects DAW stem exports: 3+ files sharing the same duration
 * (within 0.5s) AND each >= 2 min are marked as stems.
 */
export const classifyTrackTypes = (
  files: { id: string; duration: number }[]
): Map<string, TrackType> => {
  const result = new Map<string, TrackType>();

  // Group files by duration (0.5s buckets) to detect DAW stem exports
  const durationBuckets = new Map<number, typeof files>();
  for (const f of files) {
    if (f.duration <= 0) continue;
    const bucket = Math.round(f.duration * 2) / 2;
    const group = durationBuckets.get(bucket) || [];
    group.push(f);
    durationBuckets.set(bucket, group);
  }

  const stemIds = new Set<string>();
  for (const [bucket, group] of durationBuckets) {
    // Only apply DAW stem grouping for files >= 2 minutes
    // Short samples often share the same duration (e.g. one-shot drum hits)
    if (group.length >= 3 && bucket >= 120) {
      for (const f of group) {
        stemIds.add(f.id);
      }
    }
  }

  for (const f of files) {
    if (f.duration <= 0) continue;
    if (stemIds.has(f.id) || f.duration >= 120) {
      result.set(f.id, 'stem');
    } else {
      result.set(f.id, 'sample');
    }
  }

  return result;
};

type FileWithPath = File & { path?: string };

const getFilePath = (file: File, fallbackPath?: string) =>
  fallbackPath || (file as FileWithPath).path;

export const getAudioContext = () => {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext();
  }
  return sharedAudioContext;
};

/**
 * Get file content as ArrayBuffer.
 * For Tauri files with paths, fetch via convertFileSrc.
 * For regular browser files, use arrayBuffer().
 */
const getFileArrayBuffer = async (file: File, fallbackPath?: string): Promise<ArrayBuffer> => {
  // Check if file has a path property (Tauri drag & drop)
  const filePath = getFilePath(file, fallbackPath);

  if (filePath) {
    // Import convertFileSrc dynamically to avoid issues in non-Tauri environments
    const { convertFileSrc } = await import('@tauri-apps/api/core');
    const url = convertFileSrc(filePath);
    const response = await fetch(url);
    return await response.arrayBuffer();
  } else {
    // Regular browser file
    return await file.arrayBuffer();
  }
};

const calculateHash = async (buffer: ArrayBuffer): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const normalizeProfile = (profile: number[]) => {
  const sum = profile.reduce((acc, v) => acc + v, 0);
  return profile.map(v => v / sum);
};

const meanCenter = (arr: number[]): number[] => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.map(v => v - mean);
};

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const MAJOR_PROFILE = meanCenter(normalizeProfile([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]));
const MINOR_PROFILE = meanCenter(normalizeProfile([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]));

const getPow2Floor = (n: number) => {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
};

const fftRadix2 = (re: Float32Array, im: Float32Array) => {
  const n = re.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tempRe = re[i];
      re[i] = re[j];
      re[j] = tempRe;
      const tempIm = im[i];
      im[i] = im[j];
      im[j] = tempIm;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len;
    const wlenCos = Math.cos(angle);
    const wlenSin = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let wCos = 1;
      let wSin = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + len / 2] * wCos - im[i + j + len / 2] * wSin;
        const vIm = re[i + j + len / 2] * wSin + im[i + j + len / 2] * wCos;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe;
        im[i + j + len / 2] = uIm - vIm;
        const nextCos = wCos * wlenCos - wSin * wlenSin;
        const nextSin = wCos * wlenSin + wSin * wlenCos;
        wCos = nextCos;
        wSin = nextSin;
      }
    }
  }
};

const pearsonCorrelation = (a: number[], b: number[]): number => {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB;
    num += da * db; varA += da * da; varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  return denom < 1e-10 ? 0 : num / denom;
};

const accumulateChroma = (chroma: Float32Array, midi: number, energy: number) => {
  const lower = Math.floor(midi);
  const upper = lower + 1;
  const fracUpper = midi - lower;
  chroma[((lower % 12) + 12) % 12] += energy * (1 - fracUpper);
  chroma[((upper % 12) + 12) % 12] += energy * fracUpper;
};

const detectKeyFromChannel = (channelData: Float32Array, sampleRate: number): { key?: string; confidence?: number } => {
  const maxSeconds = 30;
  const maxSamples = Math.min(channelData.length, Math.floor(sampleRate * maxSeconds));
  if (maxSamples < Math.floor(sampleRate * 0.1)) {
    return {};
  }

  const targetSampleRate = 11025;
  const decimation = Math.max(1, Math.floor(sampleRate / targetSampleRate));
  const downsampledLength = Math.floor(maxSamples / decimation);
  if (downsampledLength < 512) return {};

  const downsampled = new Float32Array(downsampledLength);
  let sumSquares = 0;
  for (let i = 0; i < downsampledLength; i++) {
    const start = i * decimation;
    let acc = 0;
    const end = Math.min(start + decimation, maxSamples);
    for (let j = start; j < end; j++) {
      acc += channelData[j];
    }
    const sample = acc / Math.max(1, end - start);
    downsampled[i] = sample;
    sumSquares += sample * sample;
  }

  let mean = 0;
  for (let i = 0; i < downsampledLength; i++) {
    mean += downsampled[i];
  }
  mean /= downsampledLength;
  let centeredSumSquares = 0;
  for (let i = 0; i < downsampledLength; i++) {
    const centered = downsampled[i] - mean;
    downsampled[i] = centered;
    centeredSumSquares += centered * centered;
  }

  const rms = Math.sqrt(centeredSumSquares / downsampledLength);
  if (!Number.isFinite(rms) || rms < 0.001) return {};

  const downsampledRate = sampleRate / decimation;
  const fftSize = getPow2Floor(Math.min(4096, downsampledLength));
  if (fftSize < 512) return {};

  const hopSize = Math.floor(fftSize / 2);
  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
  }

  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);
  const chroma = new Float32Array(12);

  const minFreq = 65.41;
  const maxFreq = 5000;

  for (let start = 0; start + fftSize <= downsampledLength; start += hopSize) {
    for (let i = 0; i < fftSize; i++) {
      re[i] = downsampled[start + i] * window[i];
      im[i] = 0;
    }

    fftRadix2(re, im);

    for (let bin = 1; bin < fftSize / 2; bin++) {
      const freq = (bin * downsampledRate) / fftSize;
      if (freq < minFreq || freq > maxFreq) continue;
      const power = re[bin] * re[bin] + im[bin] * im[bin];
      if (power <= 0) continue;
      const magnitude = Math.sqrt(power);
      const midi = 69 + 12 * Math.log2(freq / 440);
      if (!Number.isFinite(midi)) continue;
      const energy = Math.log1p(magnitude);
      accumulateChroma(chroma, midi, energy);
    }
  }

  let chromaSum = 0;
  for (let i = 0; i < 12; i++) chromaSum += chroma[i];
  if (chromaSum <= 0) return {};

  for (let i = 0; i < 12; i++) chroma[i] /= chromaSum;

  let bestScore = -Infinity;
  let secondScore = -Infinity;
  let bestKey = 0;
  let bestMode: 'major' | 'minor' = 'major';

  for (let key = 0; key < 12; key++) {
    const rotatedChroma: number[] = new Array(12);
    for (let i = 0; i < 12; i++) {
      rotatedChroma[i] = chroma[(i + key) % 12];
    }

    const majorScore = pearsonCorrelation(rotatedChroma, MAJOR_PROFILE);
    if (majorScore > bestScore) {
      secondScore = bestScore;
      bestScore = majorScore;
      bestKey = key;
      bestMode = 'major';
    } else if (majorScore > secondScore) {
      secondScore = majorScore;
    }

    const minorScore = pearsonCorrelation(rotatedChroma, MINOR_PROFILE);
    if (minorScore > bestScore) {
      secondScore = bestScore;
      bestScore = minorScore;
      bestKey = key;
      bestMode = 'minor';
    } else if (minorScore > secondScore) {
      secondScore = minorScore;
    }
  }

  const keyName = KEY_NAMES[bestKey];
  const confidence = Math.max(0, bestScore - secondScore);

  if (!keyName) {
    return {};
  }

  return { key: bestMode === 'minor' ? `${keyName}m` : keyName, confidence };
};

const detectBpmFromChannel = (channelData: Float32Array, sampleRate: number): { bpm?: number; confidence?: number } => {
  const maxSeconds = 60;
  const maxSamples = Math.min(channelData.length, Math.floor(sampleRate * maxSeconds));
  if (maxSamples < Math.floor(sampleRate * 0.1)) {
    return {};
  }

  const targetSampleRate = 11025;
  const decimation = Math.max(1, Math.floor(sampleRate / targetSampleRate));
  const downsampledLength = Math.floor(maxSamples / decimation);
  if (downsampledLength < 1024) return {};

  const downsampled = new Float32Array(downsampledLength);
  for (let i = 0; i < downsampledLength; i++) {
    const start = i * decimation;
    const end = Math.min(start + decimation, maxSamples);
    let acc = 0;
    for (let j = start; j < end; j++) {
      acc += channelData[j];
    }
    downsampled[i] = acc / Math.max(1, end - start);
  }

  let mean = 0;
  for (let i = 0; i < downsampledLength; i++) {
    mean += downsampled[i];
  }
  mean /= downsampledLength;
  for (let i = 0; i < downsampledLength; i++) {
    downsampled[i] -= mean;
  }

  const fftSize = 1024;
  const hopSize = 512;
  if (downsampledLength < fftSize) return {};

  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
  }

  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);
  const prevMag = new Float32Array(fftSize / 2);
  const onsetEnvelope: number[] = [];

  for (let start = 0; start + fftSize <= downsampledLength; start += hopSize) {
    for (let i = 0; i < fftSize; i++) {
      re[i] = downsampled[start + i] * window[i];
      im[i] = 0;
    }

    fftRadix2(re, im);

    let flux = 0;
    for (let bin = 0; bin < fftSize / 2; bin++) {
      const mag = Math.hypot(re[bin], im[bin]);
      const diff = mag - prevMag[bin];
      if (diff > 0) {
        flux += diff;
      }
      prevMag[bin] = mag;
    }
    onsetEnvelope.push(flux);
  }

  if (onsetEnvelope.length === 0) return {};

  let sum = 0;
  for (const v of onsetEnvelope) sum += v;
  const meanEnv = sum / onsetEnvelope.length;
  let varSum = 0;
  for (const v of onsetEnvelope) {
    const d = v - meanEnv;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / onsetEnvelope.length);
  if (std < 1e-6) return {};

  const normalized = onsetEnvelope.map(v => (v - meanEnv) / std);
  const maxLag = Math.min(normalized.length, 2048);
  if (maxLag < 2) return {};

  const autocorr = new Float32Array(maxLag);
  for (let lag = 0; lag < maxLag; lag++) {
    let acc = 0;
    for (let i = 0; i < normalized.length - lag; i++) {
      acc += normalized[i] * normalized[i + lag];
    }
    autocorr[lag] = acc / (normalized.length - lag);
  }

  const fps = (sampleRate / decimation) / hopSize;
  const preferredBpm = 120;
  const sigma = 0.5;
  for (let lag = 1; lag < autocorr.length; lag++) {
    const bpm = (60 * fps) / lag;
    if (bpm < 30 || bpm > 300) {
      autocorr[lag] = 0;
      continue;
    }
    const logRatio = Math.log2(bpm / preferredBpm);
    const weight = Math.exp(-0.5 * Math.pow(logRatio / sigma, 2));
    autocorr[lag] *= weight;
  }

  let bestLag = 0;
  let bestVal = -Infinity;
  for (let lag = 1; lag < autocorr.length; lag++) {
    if (autocorr[lag] > bestVal) {
      bestVal = autocorr[lag];
      bestLag = lag;
    }
  }
  if (bestLag === 0) return {};

  let bpm = (60 * fps) / bestLag;
  if (!Number.isFinite(bpm) || bpm <= 0) return {};
  bpm = Math.min(300, Math.max(30, bpm));

  let selectedLag = bestLag;
  let selectedVal = autocorr[bestLag];
  const tryCandidate = (candidateBpm: number) => {
    if (candidateBpm < 40 || candidateBpm > 200) return;
    const lag = Math.round((60 * fps) / candidateBpm);
    if (lag <= 0 || lag >= autocorr.length) return;
    const val = autocorr[lag];
    if (val > selectedVal) {
      selectedVal = val;
      selectedLag = lag;
      bpm = candidateBpm;
    }
  };

  tryCandidate(bpm * 2);
  tryCandidate(bpm / 2);

  const confidence = autocorr[0] > 0 ? Math.min(1, Math.max(0, autocorr[selectedLag] / autocorr[0])) : 0;
  return { bpm, confidence };
};

export const analyzeSilence = async (file: File, filePath?: string): Promise<boolean> => {
  try {
    const arrayBuffer = await getFileArrayBuffer(file, filePath);
    const audioContext = getAudioContext();
    const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

    const channelData = decodedBuffer.getChannelData(0);
    const sampleRate = decodedBuffer.sampleRate;
    const segmentLength = sampleRate * 0.1; // Analyze 100ms segments

    // Analyze each segment
    for (let offset = 0; offset < channelData.length; offset += segmentLength) {
      const segment = channelData.slice(offset, offset + segmentLength);
      let sumSquares = 0;
      for (let i = 0; i < segment.length; i++) {
        sumSquares += segment[i] * segment[i];
      }
      const rms = Math.sqrt(sumSquares / segment.length);

      // If any segment has audio, return false
      if (rms > 0.0001) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error analyzing audio:', error);
    return false;
  }
};

export const getAudioDuration = async (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.src = '';
    };

    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      cleanup();
    };
    audio.onerror = () => {
      resolve(0);
      cleanup();
    };
    audio.src = url;
  });
};

const mixToMono = (audioBuffer: AudioBuffer): Float32Array => {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }

  const length = audioBuffer.length;
  const channelA = audioBuffer.getChannelData(0);
  const channelB = audioBuffer.getChannelData(1);
  const mixed = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    mixed[i] = (channelA[i] + channelB[i]) * 0.5;
  }
  return mixed;
};

export const detectKeyForFile = async (
  file: File,
  filePath?: string
): Promise<{ key?: string; keyConfidence?: number; error?: string }> => {
  const path = getFilePath(file, filePath);
  if (path) {
    try {
      const result = await invoke<{ key?: string; confidence: number }>('detect_key', { path });
      return { key: result.key, keyConfidence: result.confidence };
    } catch (e) {
      const error = String(e);
      console.error('Key detection failed:', error);
      return { error };
    }
  }
  return {};
};

export const detectBpmForFile = async (
  file: File,
  filePath?: string
): Promise<{ bpm?: number; bpmConfidence?: number; error?: string }> => {
  const path = getFilePath(file, filePath);
  if (!path) return {};
  try {
    const result = await invoke<{ bpm?: number; confidence: number }>('detect_bpm', { path });
    const bpmValue = typeof result.bpm === 'number' ? result.bpm : Number(result.bpm);
    return {
      bpm: Number.isFinite(bpmValue) ? Math.round(bpmValue) : undefined,
      bpmConfidence: result.confidence,
    };
  } catch (e) {
    const error = String(e);
    console.error('BPM detection failed:', error);
    return { error };
  }
};

export const processAudioFile = async (
  file: File,
  options?: { detectKey?: boolean; detectBpm?: boolean; filePath?: string },
): Promise<{
  duration: number;
  peaks?: number[][];
  hash?: string;
  key?: string;
  keyConfidence?: number;
  bpm?: number;
  bpmConfidence?: number;
}> => {
  try {
    const arrayBuffer = await getFileArrayBuffer(file);
    
    // Calculate hash
    const hash = await calculateHash(arrayBuffer);

    const audioContext = getAudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const duration = audioBuffer.duration;

    // Generate peaks (100 peaks per second)
    const channelData = mixToMono(audioBuffer);
    const peaks: number[] = [];
    const samplesPerPixel = Math.floor(audioBuffer.sampleRate / 100); // 100 peaks per second
    const length = channelData.length;

    for (let i = 0; i < length; i += samplesPerPixel) {
      let min = 0;
      let max = 0;

      for (let j = 0; j < samplesPerPixel; j++) {
        if (i + j < length) {
          const val = channelData[i + j];
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }

      // Push max absolute value for simple waveform
      peaks.push(Math.max(Math.abs(min), Math.abs(max)));
    }

    const resolvedPath = getFilePath(file, options?.filePath);
    const shouldDetectKey = options?.detectKey !== false;
    const keyData = shouldDetectKey
      ? await detectKeyForFile(file, resolvedPath)
      : {};

    const shouldDetectBpm = options?.detectBpm !== false;
    const bpmData = shouldDetectBpm
      ? await detectBpmForFile(file, resolvedPath)
      : {};

    return {
      duration,
      peaks: [peaks],
      hash,
      key: keyData.key,
      keyConfidence: keyData.keyConfidence,
      bpm: bpmData.bpm,
      bpmConfidence: bpmData.bpmConfidence,
    };
  } catch (error) {
    console.error('Error processing audio file:', error);
    // Fallback to basic duration if decoding fails
    const duration = await getAudioDuration(file);
    return { duration };
  }
};
