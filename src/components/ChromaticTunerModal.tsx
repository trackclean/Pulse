import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Pause, Play, X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAudioContext } from "@/utils/audioAnalysis";

interface ChromaticTunerModalProps {
  file: File;
  onClose: () => void;
  onKeyConfirmed: (key: string) => void;
  startOffset?: number;
  waveformPeaks?: number[];
  initialDuration?: number;
  waveformColor?: string;
}

const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const KEY_OPTIONS = [...KEY_NAMES, ...KEY_NAMES.map((k) => `${k}m`)];

const MAJOR_PROFILE_RAW = [7.239, 3.504, 5.842, 3.012, 6.047, 5.055, 3.2, 7.265, 3.421, 5.728, 3.075, 5.472];
const MINOR_PROFILE_RAW = [7.003, 3.144, 5.426, 6.409, 3.292, 5.047, 3.272, 6.804, 5.047, 3.37, 5.426, 3.81];

const CHROMA_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
];

const normalizeProfile = (profile: number[]) => {
  const sum = profile.reduce((acc, v) => acc + v, 0);
  if (sum === 0) return profile.slice();
  return profile.map((v) => v / sum);
};

const meanCenter = (arr: number[]) => {
  const mean = arr.reduce((acc, v) => acc + v, 0) / arr.length;
  return arr.map((v) => v - mean);
};

const MAJOR_PROFILE = meanCenter(normalizeProfile(MAJOR_PROFILE_RAW));
const MINOR_PROFILE = meanCenter(normalizeProfile(MINOR_PROFILE_RAW));

const pearsonCorrelation = (a: number[], b: number[]) => {
  if (a.length !== b.length || a.length === 0) return 0;
  const meanA = a.reduce((acc, v) => acc + v, 0) / a.length;
  const meanB = b.reduce((acc, v) => acc + v, 0) / b.length;
  let num = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    varA += da * da;
    varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  return denom < 1e-10 ? 0 : num / denom;
};

const accumulateChroma = (chroma: Float32Array, midi: number, energy: number) => {
  const lower = Math.floor(midi);
  const upper = lower + 1;
  const fracUpper = midi - lower;
  const fracLower = 1 - fracUpper;
  const lowerPc = ((lower % 12) + 12) % 12;
  const upperPc = ((upper % 12) + 12) % 12;
  chroma[lowerPc] += energy * fracLower;
  chroma[upperPc] += energy * fracUpper;
};

const getFileArrayBuffer = async (file: File): Promise<ArrayBuffer> => {
  const filePath = (file as File & { path?: string }).path;
  if (filePath) {
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    const url = convertFileSrc(filePath);
    const response = await fetch(url);
    return response.arrayBuffer();
  }
  return file.arrayBuffer();
};

type Peak = {
  freq: number;
  midi: number;
  magnitude: number;
  note: string;
  octave: number;
  cents: number;
};

const midiToNote = (midi: number) => {
  const rounded = Math.round(midi);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const note = KEY_NAMES[noteIndex];
  const octave = Math.floor(rounded / 12) - 1;
  const cents = (midi - rounded) * 100;
  return { note, octave, cents };
};

const computeKeySuggestion = (chroma: number[]) => {
  if (chroma.every((v) => v === 0)) {
    return { key: null as string | null, confidence: 0, bestScore: 0, secondScore: 0 };
  }

  let bestScore = -Infinity;
  let secondScore = -Infinity;
  let bestKey = 0;
  let bestMode: "major" | "minor" = "major";

  for (let key = 0; key < 12; key++) {
    const rotated = new Array(12);
    for (let i = 0; i < 12; i++) {
      rotated[i] = chroma[(i + key) % 12];
    }

    const majorScore = pearsonCorrelation(rotated, MAJOR_PROFILE);
    if (majorScore > bestScore) {
      secondScore = bestScore;
      bestScore = majorScore;
      bestKey = key;
      bestMode = "major";
    } else if (majorScore > secondScore) {
      secondScore = majorScore;
    }

    const minorScore = pearsonCorrelation(rotated, MINOR_PROFILE);
    if (minorScore > bestScore) {
      secondScore = bestScore;
      bestScore = minorScore;
      bestKey = key;
      bestMode = "minor";
    } else if (minorScore > secondScore) {
      secondScore = minorScore;
    }
  }

  const keyName = KEY_NAMES[bestKey];
  const key = bestMode === "minor" ? `${keyName}m` : keyName;
  const confidence = Math.max(0, bestScore - secondScore);

  return { key, confidence, bestScore, secondScore };
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const NUM_WAVEFORM_BARS = 300;

const resamplePeaks = (input: number[], targetLength: number) => {
  if (!input.length || targetLength <= 0) return [];
  if (input.length === targetLength) return input.slice();
  const result = new Array(targetLength).fill(0);
  const stride = input.length / targetLength;
  for (let i = 0; i < targetLength; i++) {
    const start = Math.floor(i * stride);
    const end = Math.max(start + 1, Math.floor((i + 1) * stride));
    let max = 0;
    for (let j = start; j < end && j < input.length; j++) {
      const value = Math.abs(input[j]);
      if (value > max) max = value;
    }
    result[i] = max;
  }
  return result;
};

/** Compute per-bar peak amplitudes from an AudioBuffer. */
const computeWaveformPeaks = (audioBuffer: AudioBuffer): number[] => {
  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / NUM_WAVEFORM_BARS);
  const peaks: number[] = [];
  for (let i = 0; i < NUM_WAVEFORM_BARS; i++) {
    let max = 0;
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }
  return peaks;
};

export function ChromaticTunerModal({
  file,
  onClose,
  onKeyConfirmed,
  startOffset = 0,
  waveformPeaks,
  initialDuration,
  waveformColor,
}: ChromaticTunerModalProps) {
  const [chroma, setChroma] = useState<number[]>(() => Array(12).fill(0));
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [suggestedKey, setSuggestedKey] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [status, setStatus] = useState<"loading" | "playing" | "paused" | "ended" | "error">("loading");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const isPlayingRef = useRef(false);
  const freqDataRef = useRef<Float32Array | null>(null);
  const cancelledRef = useRef(false);
  const waveformPeaksRef = useRef<number[]>([]);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);
  // Updated each render so the draw fn always sees current ref values.
  const drawWaveformRef = useRef<() => void>(() => {});
  const waveformColorRef = useRef<string>("#2dd4bf");
  const resolveWaveformColor = useCallback(() => {
    if (waveformColor) return waveformColor;
    const style = getComputedStyle(document.documentElement);
    const cssColor = style.getPropertyValue('--waveform-wave').trim();
    if (cssColor) {
      return cssColor.startsWith('#') || cssColor.includes('(') ? cssColor : `hsl(${cssColor})`;
    }
    return "#2dd4bf";
  }, [waveformColor]);

  useEffect(() => {
    const update = () => {
      waveformColorRef.current = resolveWaveformColor();
      requestAnimationFrame(() => drawWaveformRef.current());
    };
    update();
    window.addEventListener('theme-change', update);
    return () => window.removeEventListener('theme-change', update);
  }, [resolveWaveformColor]);

  drawWaveformRef.current = () => {
    const canvas = waveformCanvasRef.current;
    const peaks = waveformPeaksRef.current;
    if (!canvas || !peaks.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (!cssW || !cssH) return;

    const targetW = Math.floor(cssW * dpr);
    const targetH = Math.floor(cssH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const dur = audioBufferRef.current?.duration ?? 0;
    let progress = 0;
    if (dur > 0) {
      if (isPlayingRef.current) {
        const audioCtx = getAudioContext();
        const elapsed = audioCtx.currentTime - startTimeRef.current + startOffsetRef.current;
        progress = Math.min(elapsed, dur) / dur;
      } else {
        progress = Math.min(startOffsetRef.current, dur) / dur;
      }
    }

    const playedX = cssW * progress;
    const barW = cssW / peaks.length;
    const midY = cssH / 2;

    const waveColor = waveformColorRef.current;
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barW;
      const barH = Math.max(1, peaks[i] * cssH * 0.85);
      if (x < playedX) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = waveColor;
      } else {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = waveColor;
      }
      ctx.fillRect(x + 0.5, midY - barH / 2, Math.max(1, barW - 1), barH);
    }
    ctx.globalAlpha = 1;

    // Playhead line
    if (progress > 0 && progress < 1) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(Math.round(playedX) - 1, 0, 2, cssH);
    }
  };

  // Tick function stored in a ref so it can self-reference via RAF without
  // closure staleness issues. Updated on every render so it always reads
  // the latest ref values.
  const tickFnRef = useRef<() => void>(() => {});
  tickFnRef.current = () => {
    if (cancelledRef.current || !analyserRef.current) return;

    const audioContext = getAudioContext();
    const audioBuf = audioBufferRef.current;

    // Update playback position display
    if (audioBuf && isPlayingRef.current) {
      const elapsed = audioContext.currentTime - startTimeRef.current + startOffsetRef.current;
      setCurrentTime(Math.min(elapsed, audioBuf.duration));
    }

    const now = performance.now();
    if (now - lastUpdateRef.current >= 1000 / 24) {
      const freqData = freqDataRef.current;
      const analyser = analyserRef.current;
      if (freqData && analyser) {
        analyser.getFloatFrequencyData(freqData);

        const chromaFrame = new Float32Array(12);
        const peaksFrame: Peak[] = [];
        let minMag = Infinity;
        let minIndex = -1;

        for (let bin = 1; bin < freqData.length; bin++) {
          const db = freqData[bin];
          if (db < -80) continue;

          const freq = (bin * audioContext.sampleRate) / analyser.fftSize;
          if (freq < 65.41 || freq > 4186) continue;

          const magnitude = Math.pow(10, db / 20);
          const midi = 69 + 12 * Math.log2(freq / 440);
          if (!Number.isFinite(midi)) continue;

          accumulateChroma(chromaFrame, midi, magnitude);

          const { note, octave, cents } = midiToNote(midi);
          const peak: Peak = { freq, midi, magnitude, note, octave, cents };

          if (peaksFrame.length < 5) {
            peaksFrame.push(peak);
            if (peak.magnitude < minMag) {
              minMag = peak.magnitude;
              minIndex = peaksFrame.length - 1;
            }
          } else if (peak.magnitude > minMag && minIndex >= 0) {
            peaksFrame[minIndex] = peak;
            minMag = peaksFrame[0].magnitude;
            minIndex = 0;
            for (let i = 1; i < peaksFrame.length; i++) {
              if (peaksFrame[i].magnitude < minMag) {
                minMag = peaksFrame[i].magnitude;
                minIndex = i;
              }
            }
          }
        }

        peaksFrame.sort((a, b) => b.magnitude - a.magnitude);

        let chromaSum = 0;
        for (let i = 0; i < 12; i++) chromaSum += chromaFrame[i];
        const chromaNormalized = new Array(12).fill(0);
        if (chromaSum > 0) {
          for (let i = 0; i < 12; i++) {
            chromaNormalized[i] = chromaFrame[i] / chromaSum;
          }
        }

        const suggestion = computeKeySuggestion(chromaNormalized);

        setChroma(chromaNormalized);
        setPeaks(peaksFrame);
        setSuggestedKey(suggestion.key);
        setConfidence(suggestion.confidence);

        lastUpdateRef.current = now;
      }
    }

    drawWaveformRef.current();
    rafRef.current = requestAnimationFrame(tickFnRef.current);
  };

  // Start (or restart) playback from a given offset in seconds.
  const playFrom = useCallback((offset: number) => {
    const audioContext = getAudioContext();
    const analyser = analyserRef.current;
    const audioBuffer = audioBufferRef.current;
    if (!analyser || !audioBuffer) return;

    // Cancel existing RAF
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Stop and detach existing source
    if (sourceRef.current) {
      try { sourceRef.current.onended = null; } catch { /* ignore */ }
      try { sourceRef.current.stop(); } catch { /* ignore */ }
      try { sourceRef.current.disconnect(); } catch { /* ignore */ }
      sourceRef.current = null;
    }

    const clampedOffset = Math.max(0, Math.min(offset, audioBuffer.duration));

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    sourceRef.current = source;

    startOffsetRef.current = clampedOffset;
    startTimeRef.current = audioContext.currentTime;
    isPlayingRef.current = true;
    setCurrentTime(clampedOffset);

    source.onended = () => {
      if (!cancelledRef.current) {
        setStatus("ended");
        setIsPlaying(false);
        setCurrentTime(audioBufferRef.current?.duration ?? 0);
        isPlayingRef.current = false;
        startOffsetRef.current = 0;
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      }
    };

    source.start(0, clampedOffset);
    setStatus("playing");
    setIsPlaying(true);

    rafRef.current = requestAnimationFrame(tickFnRef.current);
  }, []);

  const pause = useCallback(() => {
    const audioContext = getAudioContext();
    const elapsed = audioContext.currentTime - startTimeRef.current + startOffsetRef.current;
    const dur = audioBufferRef.current?.duration ?? elapsed;
    startOffsetRef.current = Math.max(0, Math.min(elapsed, dur));
    isPlayingRef.current = false;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (sourceRef.current) {
      try { sourceRef.current.onended = null; } catch { /* ignore */ }
      try { sourceRef.current.stop(); } catch { /* ignore */ }
      try { sourceRef.current.disconnect(); } catch { /* ignore */ }
      sourceRef.current = null;
    }

    setIsPlaying(false);
    setStatus("paused");
    // Draw one final frame so the playhead reflects the exact pause position.
    requestAnimationFrame(() => drawWaveformRef.current());
  }, []);

  const seekTo = useCallback((offset: number) => {
    if (isPlayingRef.current) {
      playFrom(offset);
    } else {
      startOffsetRef.current = offset;
      setCurrentTime(offset);
      requestAnimationFrame(() => drawWaveformRef.current());
    }
  }, [playFrom]);

  const handleSeekStart = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const audioBuf = audioBufferRef.current;
    if (!audioBuf) return;
    isDraggingRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left);
    const ratio = Math.min(1, x / rect.width);
    seekTo(ratio * audioBuf.duration);

    const onGlobalMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mouseup", onGlobalMouseUp);
    };
    window.addEventListener("mouseup", onGlobalMouseUp);
  }, [seekTo]);

  const handleSeekMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const audioBuf = audioBufferRef.current;
    if (!audioBuf) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left);
    const ratio = Math.min(1, x / rect.width);
    seekTo(ratio * audioBuf.duration);
  }, [seekTo]);

  const handleClose = useCallback(() => {
    cancelledRef.current = true;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.onended = null; } catch { /* ignore */ }
      try { sourceRef.current.stop(); } catch { /* ignore */ }
      try { sourceRef.current.disconnect(); } catch { /* ignore */ }
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch { /* ignore */ }
      analyserRef.current = null;
    }
    isPlayingRef.current = false;
    onClose();
  }, [onClose]);

  useEffect(() => {
    cancelledRef.current = false;
    setStatus("loading");
    setManualOverride(false);
    setSelectedKey(null);
    setSuggestedKey(null);
    setConfidence(0);
    setChroma(Array(12).fill(0));
    setPeaks([]);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    isPlayingRef.current = false;
    startOffsetRef.current = 0;
    startTimeRef.current = 0;
    waveformPeaksRef.current = waveformPeaks?.length
      ? resamplePeaks(waveformPeaks, NUM_WAVEFORM_BARS)
      : [];
    if (typeof initialDuration === "number" && initialDuration > 0) {
      setDuration(initialDuration);
    }
    if (waveformPeaksRef.current.length) {
      requestAnimationFrame(() => drawWaveformRef.current());
    }

    const audioContext = getAudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 32768;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;
    freqDataRef.current = new Float32Array(analyser.frequencyBinCount);
    analyser.connect(audioContext.destination);

    const load = async () => {
      try {
        const arrayBuffer = await getFileArrayBuffer(file);
        if (cancelledRef.current) return;

        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        if (cancelledRef.current) return;

        audioBufferRef.current = audioBuffer;
        setDuration(audioBuffer.duration);
        if (!waveformPeaksRef.current.length) {
          waveformPeaksRef.current = computeWaveformPeaks(audioBuffer);
        }
        // Draw static waveform once the canvas has laid out.
        requestAnimationFrame(() => drawWaveformRef.current());

        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
        if (cancelledRef.current) return;

        const initialOffset = Math.max(0, Math.min(startOffset, audioBuffer.duration));
        setCurrentTime(initialOffset);
        playFrom(initialOffset);
      } catch (error) {
        if (!cancelledRef.current) {
          console.error("Chromatic tuner error:", error);
          setStatus("error");
        }
      }
    };

    load();

    return () => {
      cancelledRef.current = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (sourceRef.current) {
        try { sourceRef.current.onended = null; } catch { /* ignore */ }
        try { sourceRef.current.stop(); } catch { /* ignore */ }
        try { sourceRef.current.disconnect(); } catch { /* ignore */ }
        sourceRef.current = null;
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch { /* ignore */ }
        analyserRef.current = null;
      }
      isPlayingRef.current = false;
    };
  }, [file, playFrom, startOffset, waveformPeaks, initialDuration]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (isPlayingRef.current) {
        pause();
      } else {
        playFrom(startOffsetRef.current);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [pause, playFrom]);

  useEffect(() => {
    if (!manualOverride && suggestedKey) {
      setSelectedKey(suggestedKey);
    }
  }, [suggestedKey, manualOverride]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 180;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const paddingX = 12;
    const paddingBottom = 22;
    const barGap = 8;
    const availableWidth = width - paddingX * 2;
    const barWidth = (availableWidth - barGap * 11) / 12;
    const maxBarHeight = height - paddingBottom - 8;

    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    for (let i = 0; i < 12; i++) {
      const barHeight = maxBarHeight * chroma[i];
      const x = paddingX + i * (barWidth + barGap);
      const y = height - paddingBottom - barHeight;

      ctx.fillStyle = CHROMA_COLORS[i];
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
      ctx.fillText(KEY_NAMES[i], x + barWidth / 2, height - 6);
    }
  }, [chroma]);

  const dominantPeak = peaks[0];
  const cents = dominantPeak?.cents ?? 0;
  const centsAbs = Math.abs(cents);
  const centsColor =
    centsAbs < 5 ? "bg-emerald-500" : centsAbs < 15 ? "bg-yellow-500" : "bg-red-500";

  const confidenceLabel = useMemo(() => {
    if (!suggestedKey) return "--";
    return confidence.toFixed(3);
  }, [confidence, suggestedKey]);

  const handleConfirm = useCallback(() => {
    if (!selectedKey) return;
    onKeyConfirmed(selectedKey);
    handleClose();
  }, [selectedKey, onKeyConfirmed, handleClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-[min(1100px,95vw)] max-h-[85vh] translate-x-[-50%] translate-y-[-50%]",
            "flex flex-col gap-6 overflow-y-auto rounded-lg border bg-background p-6 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>Chromatic Tuner</DialogTitle>
              <DialogDescription>
                Analyze pitch, chroma, and key while listening to the sample.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                {status}
              </Badge>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>

          {/* Playback controls */}
          {duration > 0 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => (isPlaying ? pause() : playFrom(startOffsetRef.current))}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              {/* Waveform seek bar */}
              <canvas
                ref={waveformCanvasRef}
                className="flex-1 h-14 rounded cursor-pointer"
                onMouseDown={handleSeekStart}
                onMouseMove={handleSeekMove}
              />
              <span className="text-xs text-muted-foreground tabular-nums font-mono w-20 text-right">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Dominant Note
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-semibold">
                        {dominantPeak ? dominantPeak.note : "--"}
                      </span>
                      <span className="text-2xl text-muted-foreground">
                        {dominantPeak ? dominantPeak.octave : ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>Freq: {dominantPeak ? `${dominantPeak.freq.toFixed(2)} Hz` : "--"}</div>
                    <div>Cents: {dominantPeak ? `${dominantPeak.cents.toFixed(1)}¢` : "--"}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Flat</span>
                    <span>In Tune</span>
                    <span>Sharp</span>
                  </div>
                  <div className="relative mt-2 h-2 rounded-full bg-muted">
                    <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-muted-foreground/60" />
                    <div
                      className={cn("absolute top-0 h-full w-2 -translate-x-1/2 rounded-full", centsColor)}
                      style={{
                        left: `calc(50% + ${Math.max(-50, Math.min(50, cents))}%)`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Chroma Spectrum
                </div>
                <canvas ref={canvasRef} className="mt-3 h-40 w-full" />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Suggested Key
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Confidence {confidenceLabel}
                  </Badge>
                </div>
                <div className="mt-2 text-3xl font-semibold">
                  {suggestedKey ?? "--"}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Top 5 Notes
                </div>
                <div className="mt-3 space-y-3">
                  {peaks.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No strong peaks detected.</div>
                  ) : (
                    peaks.map((peak, index) => {
                      const maxMag = peaks[0]?.magnitude || 1;
                      const width = Math.max(6, (peak.magnitude / maxMag) * 100);
                      return (
                        <div key={`${peak.note}-${index}`} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-mono">
                              {peak.note}
                              {peak.octave}
                            </span>
                            <span className="text-muted-foreground">
                              {peak.freq.toFixed(1)} Hz · {peak.cents.toFixed(1)}¢
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary/70"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Manual Key Selector
                </div>
                <div className="mt-3 grid grid-cols-6 gap-2">
                  {KEY_OPTIONS.map((key) => (
                    <Button
                      key={key}
                      variant={selectedKey === key ? "default" : "outline"}
                      size="sm"
                      className={cn("h-9 text-xs font-mono", selectedKey === key && "shadow-button")}
                      onClick={() => {
                        setSelectedKey(key);
                        setManualOverride(true);
                      }}
                    >
                      {key}
                    </Button>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button className="flex-1" onClick={handleConfirm} disabled={!selectedKey}>
                    Confirm Key
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
