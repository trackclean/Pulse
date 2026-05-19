import { useEffect, useRef, useState, useCallback, memo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { waveformQueue } from '@/utils/waveformQueue';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const applyAlphaToColor = (color: string, alpha: number) => {
  const a = clamp01(alpha);
  const trimmed = color.trim();
  if (!trimmed) return color;

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    const normalized = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex;
    if (normalized.length === 6) {
      const r = parseInt(normalized.slice(0, 2), 16);
      const g = parseInt(normalized.slice(2, 4), 16);
      const b = parseInt(normalized.slice(4, 6), 16);
      if ([r, g, b].every((v) => Number.isFinite(v))) {
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
    }
    return color;
  }

  if (trimmed.startsWith('rgb(')) {
    const body = trimmed.slice(4, -1);
    return `rgba(${body}, ${a})`;
  }
  if (trimmed.startsWith('rgba(')) {
    const body = trimmed.slice(5, -1);
    const parts = body.split(',').map((p) => p.trim());
    if (parts.length >= 3) {
      return `rgba(${parts.slice(0, 3).join(', ')}, ${a})`;
    }
    return color;
  }
  if (trimmed.startsWith('hsl(')) {
    const body = trimmed.slice(4, -1).trim();
    if (body.includes(',')) {
      return `hsla(${body}, ${a})`;
    }
    return `hsla(${body} / ${a})`;
  }
  if (trimmed.startsWith('hsla(')) {
    const body = trimmed.slice(5, -1).trim();
    if (body.includes(',')) {
      const parts = body.split(',').map((p) => p.trim());
      if (parts.length >= 3) {
        return `hsla(${parts.slice(0, 3).join(', ')}, ${a})`;
      }
      return color;
    }
    const base = body.split('/')[0]?.trim();
    if (!base) return color;
    return `hsla(${base} / ${a})`;
  }

  return color;
};

const buildWaveColors = (baseColor: string) => {
  return {
    waveColor: applyAlphaToColor(baseColor, 0.25),
    progressColor: baseColor,
    cursorColor: applyAlphaToColor(baseColor, 0.6),
  };
};

interface WaveformProps {
  audioUrl: string;
  isPlaying: boolean;
  id?: string;
  onReady?: (duration: number) => void;
  onFinish?: () => void;
  isSilent?: boolean;
  playbackSpeed?: number;
  peaks?: number[][];
  waveColor?: string;
  theme?: string;
  resetOnStop?: boolean;
  onInteraction?: () => void;
  onTimeUpdate?: (time: number) => void;
}

const WaveformComponent = ({ audioUrl, isPlaying, id, onReady, onFinish, isSilent, playbackSpeed = 1, peaks, waveColor, theme, resetOnStop = false, onInteraction, onTimeUpdate }: WaveformProps) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const waveformRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setContainer(node);
    }
  }, []);

  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [wavesurferInstance, setWavesurferInstance] = useState<WaveSurfer | null>(null);
  const onInteractionRef = useRef(onInteraction);
  const onReadyRef = useRef(onReady);
  const onFinishRef = useRef(onFinish);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const lastTimeUpdateRef = useRef(0);
  const isReadyRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const [themeVersion, setThemeVersion] = useState(0);
  // Removed visibility optimization to keep waveforms visible during scroll
  const shouldRender = true;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const cleanupWaveSurfer = () => {
    if (!wavesurferRef.current) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (wavesurferRef.current as any)?.unAll?.();
      wavesurferRef.current.destroy();
    } catch (e) {
      // ignore destroy errors
    }
    wavesurferRef.current = null;
    setWavesurferInstance(null);
    isReadyRef.current = false;
  };

  // Listen for theme changes (instant preview)
  useEffect(() => {
    const handler = () => setThemeVersion(v => v + 1);
    window.addEventListener('theme-change', handler);
    return () => window.removeEventListener('theme-change', handler);
  }, []);

  // Keep refs updated
  useEffect(() => {
    onReadyRef.current = onReady;
    onFinishRef.current = onFinish;
    onInteractionRef.current = onInteraction;
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onReady, onFinish, onInteraction, onTimeUpdate]);

  // Keep track of initial waveform color - always use the latest value
  const initialColorRef = useRef(waveColor);
  initialColorRef.current = waveColor; // Always update to latest value

  useEffect(() => {
    if (!shouldRender || !container) {
      return;
    }

    // Only create a new instance if we don't have one
    if (wavesurferRef.current) return;

    isReadyRef.current = false;

    // Small delay to ensure container is ready and has dimensions
    const initTimer = setTimeout(() => {
      if (!container) return;
      
      try {
        // Get the current color value at creation time
        const currentColor = initialColorRef.current || '#3b82f6';
        const { waveColor: baseWaveColor, progressColor, cursorColor } = buildWaveColors(
          isSilent ? '#ef4444' : currentColor
        );
        
        const wavesurfer = WaveSurfer.create({
          container: container,
          waveColor: baseWaveColor,
          progressColor,
          cursorColor,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 40,
          normalize: true,
          dragToSeek: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        wavesurfer.on('ready', () => {
          isReadyRef.current = true;
          onReadyRef.current?.(wavesurfer.getDuration());
          if (isPlayingRef.current) {
            wavesurfer.play();
          }
        });

        wavesurfer.on('finish', () => {
          onFinishRef.current?.();
          if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current(wavesurfer.getDuration());
          }
        });

        wavesurfer.on('error', (error) => {
          console.error('Waveform error:', error);
        });

        wavesurfer.on('interaction', () => {
          onInteractionRef.current?.();
          if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current(wavesurfer.getCurrentTime());
          }
        });

        wavesurfer.on('audioprocess', (time) => {
          if (!onTimeUpdateRef.current) return;
          const now = performance.now();
          if (now - lastTimeUpdateRef.current < 150) return;
          lastTimeUpdateRef.current = now;
          onTimeUpdateRef.current(time);
        });

        wavesurferRef.current = wavesurfer;
        setWavesurferInstance(wavesurfer);
      } catch (e) {
        console.error('Failed to initialize WaveSurfer:', e);
      }
    }, 10);

    return () => {
      clearTimeout(initTimer);
    };
  }, [shouldRender, isSilent, container]);

  const prevAudioUrlRef = useRef(audioUrl);

  useEffect(() => {
    if (!wavesurferInstance || !shouldRender) return;

    const urlChanged = audioUrl !== prevAudioUrlRef.current;
    if (urlChanged) {
      isReadyRef.current = false;
      prevAudioUrlRef.current = audioUrl;
    }

    if (isReadyRef.current) return;

    const cancel = waveformQueue.enqueue(async () => {
      if (!wavesurferRef.current) return;
      try {
        await wavesurferRef.current.load(audioUrl, peaks);
      } catch (error) {
        // Ignore abort errors which happen when the component unmounts or reloads
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Waveform update error:', error);
      }
    }, isPlaying);

    return () => {
      cancel();
    };
  }, [audioUrl, shouldRender, isPlaying, peaks, isSilent, wavesurferInstance]);

  // Listen for external stop events (e.g., when deleting a track)
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const custom = e as CustomEvent;
        const stopId = custom?.detail?.id;
        if (!stopId || !id) return;
        // Only stop if the event targets this waveform
        if (stopId !== id) return;
        if (wavesurferRef.current) {
          try {
            wavesurferRef.current.pause();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (typeof (wavesurferRef.current as any).stop === 'function') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (wavesurferRef.current as any).stop();
            }
          } catch (err) {
            // ignore errors during stop
          }
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('stop-audio', handler as EventListener);
    return () => window.removeEventListener('stop-audio', handler as EventListener);
  }, [id]);

  useEffect(() => {
    if (!wavesurferRef.current) return;

    try {
      if (isPlaying) {
        if (isReadyRef.current) {
          wavesurferRef.current.play();
        }
      } else {
        wavesurferRef.current.pause();
        if (resetOnStop) {
          wavesurferRef.current.seekTo(0);
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  }, [isPlaying, resetOnStop]);

  useEffect(() => {
    if (!wavesurferRef.current || !isReadyRef.current) return;
    try {
      wavesurferRef.current.setPlaybackRate(playbackSpeed);
    } catch (error) {
      console.error('Playback speed error:', error);
    }
  }, [playbackSpeed]);

  useEffect(() => {
    if (!wavesurferRef.current) return;

    // Wait for waveform to be fully ready
    if (!isReadyRef.current) {
      // Queue the color update for when it's ready
      const checkReady = setInterval(() => {
        if (isReadyRef.current && wavesurferRef.current) {
          clearInterval(checkReady);
          updateWaveformColor();
        }
      }, 50);

      return () => clearInterval(checkReady);
    }

    updateWaveformColor();

    function updateWaveformColor() {
      if (!wavesurferRef.current) return;
      try {
        let color = isSilent ? '#ef4444' : '#3b82f6'; // Default fallback

        if (!isSilent) {
          // If not silent, try to use the provided waveColor or read from CSS
          if (waveColor) {
            color = waveColor;
          } else {
            // Read from CSS variable. The stylesheet defines the variable as
            // bare HSL numbers (e.g. "180 50% 40%") for use in hsl(var(...))
            // in CSS. WaveSurfer needs a complete color string, so wrap it.
            const style = getComputedStyle(document.documentElement);
            const cssColor = style.getPropertyValue('--waveform-wave').trim();
            if (cssColor) {
              color = cssColor.startsWith('#') || cssColor.includes('(')
                ? cssColor
                : `hsl(${cssColor})`;
            }
          }
        }

        const { waveColor: baseWaveColor, progressColor, cursorColor } = buildWaveColors(color);
        wavesurferRef.current.setOptions({
          waveColor: baseWaveColor,
          progressColor,
          cursorColor,
        });
      } catch (error) {
        console.error('Wave color update error:', error);
      }
    }
  }, [isSilent, waveColor, theme, themeVersion]);

  return <div ref={waveformRef} className="w-full h-[40px]" />;
};

export const Waveform = memo(WaveformComponent);
