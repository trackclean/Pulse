import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const root = process.cwd();
const outDir = path.join(root, 'e2e', 'test-audio');
const batchDir = path.join(outDir, 'batch-110');

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(batchDir, { recursive: true });

const MB = 1024 * 1024;

const envNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const large100Mb = envNumber(process.env.E2E_LARGE_100_MB, 100);
const large500Mb = envNumber(process.env.E2E_LARGE_500_MB, 500);
const generateNonWav = process.env.GENERATE_NON_WAV === '1' || process.env.GENERATE_NON_WAV === 'true';

function writeWav({
  filePath,
  durationSec,
  sampleRate = 44100,
  numChannels = 1,
  bitDepth = 16,
  generator,
  repeat = false,
  chunkFrames = 0,
}) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const totalFrames = Math.max(1, Math.floor(durationSec * sampleRate));
  const dataBytes = totalFrames * blockAlign;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);

  const stream = fs.createWriteStream(filePath);
  stream.write(header);

  const framesPerChunk = chunkFrames > 0 ? chunkFrames : sampleRate;
  const maxSample = bitDepth === 16 ? 0x7fff : 0x7fffffff;

  const makeChunk = (frameCount, startFrame) => {
    const buffer = Buffer.alloc(frameCount * blockAlign);
    let offset = 0;
    for (let i = 0; i < frameCount; i++) {
      const t = (startFrame + i) / sampleRate;
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = generator ? generator(t, ch) : 0;
        if (!Number.isFinite(sample)) sample = 0;
        sample = Math.max(-1, Math.min(1, sample));
        const intSample = Math.round(sample * maxSample);
        if (bitDepth === 16) {
          buffer.writeInt16LE(intSample, offset);
        } else {
          buffer.writeInt32LE(intSample, offset);
        }
        offset += bytesPerSample;
      }
    }
    return buffer;
  };

  const fullChunks = Math.floor(totalFrames / framesPerChunk);
  const remainder = totalFrames % framesPerChunk;

  if (repeat) {
    const chunk = makeChunk(framesPerChunk, 0);
    for (let i = 0; i < fullChunks; i++) stream.write(chunk);
    if (remainder > 0) stream.write(makeChunk(remainder, 0));
  } else {
    for (let i = 0; i < fullChunks; i++) {
      stream.write(makeChunk(framesPerChunk, i * framesPerChunk));
    }
    if (remainder > 0) {
      stream.write(makeChunk(remainder, fullChunks * framesPerChunk));
    }
  }

  stream.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

function durationForSize(targetBytes, sampleRate, numChannels, bitDepth) {
  const bytesPerSecond = sampleRate * numChannels * (bitDepth / 8);
  return Math.ceil(targetBytes / bytesPerSecond);
}

const sine = (freq, amp = 0.6) => (t) => Math.sin(2 * Math.PI * freq * t) * amp;

const stereoSine = (leftFreq, rightFreq, amp = 0.5) => (t, ch) =>
  Math.sin(2 * Math.PI * (ch === 0 ? leftFreq : rightFreq) * t) * amp;

const chordAmin = (t) => {
  const a = Math.sin(2 * Math.PI * 220 * t);
  const c = Math.sin(2 * Math.PI * 261.63 * t);
  const e = Math.sin(2 * Math.PI * 329.63 * t);
  return (a + c + e) / 3 * 0.8;
};

const clickTrack = (bpm, amp = 0.9) => {
  const interval = 60 / bpm;
  const clickDur = 0.01;
  return (t) => {
    const phase = t % interval;
    if (phase < clickDur) {
      return Math.sin(2 * Math.PI * 1000 * t) * amp;
    }
    return 0;
  };
};

const files = [];

// Core edge cases
files.push({
  name: 'silent_5s.wav',
  duration: 5,
  generator: () => 0,
});
files.push({
  name: 'very_short_0_5s.wav',
  duration: 0.5,
  generator: sine(440, 0.5),
});
files.push({
  name: 'known_bpm_120.wav',
  duration: 12,
  generator: clickTrack(120),
  repeat: true,
});
files.push({
  name: 'known_key_Amin.wav',
  duration: 8,
  generator: chordAmin,
  repeat: true,
});

// Long stems (>= 2 minutes)
const stemDuration = 150; // 2.5 minutes
files.push({ name: 'long_stem_A_150s.wav', duration: stemDuration, generator: sine(220, 0.5), repeat: true });
files.push({ name: 'long_stem_B_150s.wav', duration: stemDuration, generator: sine(330, 0.5), repeat: true });
files.push({ name: 'long_stem_C_150s.wav', duration: stemDuration, generator: sine(440, 0.5), repeat: true });

// Category keywords (content can be simple)
files.push({ name: 'bass_sub_01.wav', duration: 2, generator: sine(110, 0.5), repeat: true });
files.push({ name: 'synth_pad_01.wav', duration: 2, generator: sine(330, 0.4), repeat: true });
files.push({ name: 'vocal_phrase_01.wav', duration: 2, generator: sine(220, 0.4), repeat: true });
files.push({ name: 'fx_riser_01.wav', duration: 2, generator: sine(880, 0.3), repeat: true });
files.push({ name: 'perc_shaker_01.wav', duration: 2, generator: sine(660, 0.3), repeat: true });

// Special filename cases
files.push({ name: 'Test!@#$%.wav', duration: 2, generator: sine(250, 0.4), repeat: true });
files.push({ name: '\u65e5\u672c\u8a9e\u30c6\u30b9\u30c8.wav', duration: 2, generator: sine(300, 0.4), repeat: true });
files.push({ name: 'æ—¥æœ¬èªžãƒ†ã‚¹ãƒˆ.wav', duration: 2, generator: sine(300, 0.4), repeat: true });

// Duplicate pair (same content, different names)
files.push({ name: 'duplicate_source.wav', duration: 3, generator: sine(440, 0.5), repeat: true });
files.push({ name: 'duplicate_copy.wav', duration: 3, generator: sine(440, 0.5), repeat: true });

for (const f of files) {
  const filePath = path.join(outDir, f.name);
  await writeWav({
    filePath,
    durationSec: f.duration,
    generator: f.generator,
    repeat: f.repeat ?? false,
  });
}

// Large files (100MB+ and 500MB+)
const bigSampleRate = 96000;
const bigBitDepth = 32;
const bigChannels = 2;

const duration100 = durationForSize(large100Mb * MB, bigSampleRate, bigChannels, bigBitDepth);
const duration500 = durationForSize(large500Mb * MB, bigSampleRate, bigChannels, bigBitDepth);

await writeWav({
  filePath: path.join(outDir, 'large_100mb.wav'),
  durationSec: duration100,
  sampleRate: bigSampleRate,
  numChannels: bigChannels,
  bitDepth: bigBitDepth,
  generator: stereoSine(100, 120, 0.4),
  repeat: true,
});

await writeWav({
  filePath: path.join(outDir, 'large_500mb.wav'),
  durationSec: duration500,
  sampleRate: bigSampleRate,
  numChannels: bigChannels,
  bitDepth: bigBitDepth,
  generator: stereoSine(100, 120, 0.4),
  repeat: true,
});

// Batch of 110 small, unique files
for (let i = 0; i < 110; i++) {
  const freq = 200 + i;
  const name = `batch_${String(i + 1).padStart(3, '0')}.wav`;
  await writeWav({
    filePath: path.join(batchDir, name),
    durationSec: 0.12,
    generator: sine(freq, 0.5),
    repeat: false,
  });
}

// Non-audio files
fs.writeFileSync(path.join(outDir, 'not_audio.txt'), 'not audio');
fs.writeFileSync(path.join(outDir, 'not_audio.jpg'), 'not a real image');

// Optional: generate non-WAV formats via ffmpeg
// Each conversion is tried individually — missing encoders are warned, not fatal.
const tryFfmpeg = (args, label) => {
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'pipe' });
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString() : '';
    console.warn(`⚠ Skipped ${label}: ${stderr.trim() || error.message}`);
    return false;
  }
  return true;
};

if (generateNonWav) {
  const sourcePath = path.join(outDir, 'sample1_source.wav');
  if (!fs.existsSync(sourcePath)) {
    await writeWav({
      filePath: sourcePath,
      durationSec: 2,
      generator: sine(440, 0.5),
      repeat: true,
    });
  }

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source WAV was not created at ${sourcePath}`);
  }

  const conversions = [
    { args: ['-i', sourcePath, '-codec:a', 'libmp3lame', '-q:a', '4', path.join(outDir, 'sample1_mp3.mp3')], label: 'MP3' },
    // Try libvorbis first, fall back to built-in vorbis encoder
    { args: ['-i', sourcePath, '-codec:a', 'libvorbis', '-q:a', '4', path.join(outDir, 'sample1_ogg.ogg')], label: 'OGG (libvorbis)',
      fallback: { args: ['-i', sourcePath, '-codec:a', 'vorbis', '-q:a', '4', path.join(outDir, 'sample1_ogg.ogg')], label: 'OGG (vorbis)' } },
    { args: ['-i', sourcePath, '-codec:a', 'flac', path.join(outDir, 'sample1_flac.flac')], label: 'FLAC' },
    { args: ['-i', sourcePath, '-codec:a', 'aac', '-b:a', '192k', path.join(outDir, 'sample1_m4a.m4a')], label: 'M4A' },
    { args: ['-i', sourcePath, '-codec:a', 'aac', '-b:a', '192k', path.join(outDir, 'sample1_aac.aac')], label: 'AAC' },
    { args: ['-i', sourcePath, '-codec:a', 'wmav2', '-b:a', '192k', path.join(outDir, 'sample1_wma.wma')], label: 'WMA' },
  ];

  let converted = 0;
  for (const c of conversions) {
    if (tryFfmpeg(c.args, c.label)) {
      converted++;
    } else if (c.fallback && tryFfmpeg(c.fallback.args, c.fallback.label)) {
      converted++;
    }
  }
  console.log(`Converted ${converted}/${conversions.length} non-WAV formats.`);
}

console.log('Test audio generated in:', outDir);
