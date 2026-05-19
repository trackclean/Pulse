import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SAMPLE_RATE = 44100;
const BPM = 120;
const DURATION_SEC = 8;
const CLICK_SAMPLES = 200;
const TOLERANCE_BPM = 4;

const createClickTrack = () => {
  const totalSamples = SAMPLE_RATE * DURATION_SEC;
  const data = Buffer.alloc(totalSamples * 2);
  const secondsPerBeat = 60 / BPM;
  const beats = Math.floor(DURATION_SEC / secondsPerBeat);

  for (let i = 0; i < beats; i += 1) {
    const start = Math.round(i * secondsPerBeat * SAMPLE_RATE);
    for (let j = 0; j < CLICK_SAMPLES && start + j < totalSamples; j += 1) {
      const sample = Math.round(0.85 * 32767);
      data.writeInt16LE(sample, (start + j) * 2);
    }
  }

  const dataSize = data.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, data]);
};

const parseBeatTimes = (output) => {
  return output
    .split('\n')
    .map((line) => Number.parseFloat(line.trim()))
    .filter((value) => Number.isFinite(value));
};

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const run = () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'aubio-bpm-'));
  const wavPath = join(tempDir, 'click.wav');
  const wavData = createClickTrack();
  writeFileSync(wavPath, wavData);

  let stdout = '';
  try {
    stdout = execFileSync('aubiotrack', [wavPath], { encoding: 'utf8' });
  } catch (error) {
    console.error('Failed to run aubiotrack:', error?.message || error);
    rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  const beats = parseBeatTimes(stdout);
  if (beats.length < 3) {
    console.error('Not enough beats detected from aubiotrack output.');
    console.error(stdout);
    rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  const intervals = [];
  for (let i = 1; i < beats.length; i += 1) {
    const delta = beats[i] - beats[i - 1];
    if (delta > 0) intervals.push(delta);
  }
  const medianInterval = median(intervals);
  if (!medianInterval) {
    console.error('Could not compute median interval.');
    rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  const detectedBpm = 60 / medianInterval;
  const delta = Math.abs(detectedBpm - BPM);
  if (delta > TOLERANCE_BPM) {
    console.error(`Detected BPM ${detectedBpm.toFixed(2)} outside tolerance ±${TOLERANCE_BPM} of ${BPM}.`);
    rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  console.log(`aubiotrack OK: ${detectedBpm.toFixed(2)} BPM (target ${BPM})`);
  rmSync(tempDir, { recursive: true, force: true });
};

run();
