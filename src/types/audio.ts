export type TrackType = 'stem' | 'sample';

export interface AudioFile {
  id: string;
  file: File;
  name: string;
  duration: number;
  isSilent: boolean;
  isPlaying: boolean;
  volume: number;
  url: string;
  filePath?: string; // Store the original file path for Tauri
  category?: string;
  trackType?: TrackType;
  isFavorite?: boolean;
  playbackSpeed?: number;
  isSelected?: boolean;
  isWaveformReady?: boolean;
  peaks?: number[][];
  originalIndex?: number;
  hash?: string;
  isDuplicate?: boolean;
  key?: string;
  keyConfidence?: number;
  bpm?: number;
  bpmConfidence?: number;
}

export type RenameRule = {
  keywords: string[];
  replacement: string;
};

export const RENAME_RULES: RenameRule[] = [
  // 🥁 DRUM ELEMENTS
  { keywords: ['kick', 'bd', 'kck', 'subkick', 'lowkick'], replacement: 'Kick' },
  { keywords: ['snare', 'snr', 'rim', 'rims'], replacement: 'Snare' },
  { keywords: ['clap', 'handclap'], replacement: 'Clap' },
  { keywords: ['hat', 'hh', 'hihat', 'closedhat', 'openhihat', 'openhat'], replacement: 'HiHat' },
  { keywords: ['perc', 'percussion', 'bongo', 'conga', 'tom', 'shaker', 'tamb', 'tambourine'], replacement: 'Percussion' },
  { keywords: ['drumloop', 'drum_loop', 'toploop'], replacement: 'DrumLoop' },

  // 🎸 INSTRUMENTS
  { keywords: ['gtr', 'guitar', 'acoustic', 'electricgtr', 'plucked', 'strum'], replacement: 'Guitar' },
  { keywords: ['piano', 'keys', 'rhodes', 'epiano'], replacement: 'Piano' },
  { keywords: ['string', 'violin', 'cello', 'strings', 'orchestra', 'harp'], replacement: 'Strings' },
  { keywords: ['brass', 'trumpet', 'trombone', 'horn'], replacement: 'Brass' },
  { keywords: ['flute', 'woodwind', 'sax', 'clarinet'], replacement: 'Woodwind' },

  // 🎹 SYNTHS
  { keywords: ['synth', 'lead', 'pad', 'pluck', 'arp', 'seq', 'saw', 'square', 'poly', 'mono'], replacement: 'Synth' },
  { keywords: ['reese', 'basslead'], replacement: 'Reese' },

  // 🎧 BASS
  { keywords: ['bass', 'sub', '808', 'lowend', 'lowsub'], replacement: 'Bass' },

  // 💥 FX / TRANSITIONS
  { keywords: ['effect', 'impact', 'sweep', 'riser', 'fall', 'downlifter', 'uplifter', 'boom'], replacement: 'FX' },
  { keywords: ['white', 'whoosh', 'wash'], replacement: 'NoiseFX' },
  { keywords: ['drop', 'fill', 'transition'], replacement: 'Transition' },

  // 🎤 VOCALS
  { keywords: ['vox', 'vocal', 'voice', 'chant', 'shout', 'phrase', 'adlib', 'acapella', 'bgv', 'backing'], replacement: 'Vocal' },

  // 🌌 BACKGROUND / AMBIENT
  { keywords: ['background', 'bg', 'ambient', 'atmos', 'texture', 'drone', 'space', 'room', 'env', 'field'], replacement: 'Background' },

  // 🥶 FX TEXTURES / OTHER
  { keywords: ['glitch', 'granular', 'stutter', 'fxloop'], replacement: 'GlitchFX' },
  { keywords: ['click', 'pop', 'noise'], replacement: 'Artifact' },

  // 🔊 OTHER COMMON STEMS
  { keywords: ['beat', 'drums', 'rhythm'], replacement: 'DrumStem' },
  // Generic 'loop' keyword acts as a fallback for any loop files not caught by more specific rules above
  { keywords: ['loop'], replacement: 'Loop' },
  { keywords: ['melody', 'melodic', 'harm', 'harmony'], replacement: 'Melody' },
  { keywords: ['chord', 'chords', 'progression'], replacement: 'Chords' },
  { keywords: ['fx', 'ambience', 'sfx'], replacement: 'FX' },
];
