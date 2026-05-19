import fs from 'fs';
import path from 'path';

const root = process.cwd();
const outDir = path.join(root, 'e2e', 'wav files');

fs.mkdirSync(outDir, { recursive: true });

const sampleRate = 44100;
const durationSec = 1.2;
const numChannels = 1;
const bitDepth = 16;

const writeWav = (filePath, freq = 220) => {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const totalFrames = Math.max(1, Math.floor(durationSec * sampleRate));
  const dataBytes = totalFrames * blockAlign;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);

  const buffer = Buffer.alloc(dataBytes);
  const maxSample = 0x7fff;
  for (let i = 0; i < totalFrames; i += 1) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.6;
    const intSample = Math.round(sample * maxSample);
    buffer.writeInt16LE(intSample, i * 2);
  }

  fs.writeFileSync(filePath, Buffer.concat([header, buffer]));
};

const fileNames = [
  '_RGD_BD_PROH_125BPM_DRUM_LOOP_001.wav',
  '_RGD_BD_PROH_125BPM_DRUM_LOOP_002.wav',
  '_RGD_BD_PROH_126BPM_DRUM_LOOP_001.wav',
  '_RGD_BD_PROH_126BPM_DRUM_LOOP_002.wav',
  '_RGD_BD_PROH_126BPM_DRUM_LOOP_003.wav',
  '_RGD_BD_PROH_126BPM_DRUM_LOOP_004.wav',
  '_RGD_BD_PROH_126BPM_DRUM_LOOP_005.wav',
  '_RGD_BD_PROH_126BPM_DRUM_LOOP_006.wav',
  '_RGD_BD_PROH_126BPM_DRUM_LOOP_007.wav',
  '_RGD_BD_PROH_126BPM_DRUM_LOOP_008.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_001.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_002.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_003.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_004.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_005.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_006.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_007.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_008.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_009.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_010.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_011.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_012.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_013.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_014.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_015.wav',
  '_RGD_BD_PROH_128BPM_DRUM_LOOP_016.wav',
  '_RGD_BD_PROH_130BPM_DRUM_LOOP_001.wav',
];

fileNames.forEach((name, index) => {
  const filePath = path.join(outDir, name);
  if (!fs.existsSync(filePath)) {
    writeWav(filePath, 180 + index * 5);
  }
});

console.log(`Generated ${fileNames.length} WAV fixtures in ${outDir}`);
