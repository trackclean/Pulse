import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Play, Pause, Trash2, Volume2, AlertCircle, Loader2, Copy } from 'lucide-react';
import { AudioFile } from '@/types/audio';
import { Waveform } from './Waveform';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { KeyTreeSelector } from './KeyTreeSelector';
import { CategoryRule } from '@/utils/categoryConfig';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AudioFileCardProps {
  audioFile: AudioFile;
  onPlay: (id: string) => void;
  onPause: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onDurationUpdate: (id: string, duration: number) => void;
  onCategoryChange: (id: string, category: string) => void;
  onKeyChange?: (id: string, key: string) => void;
  onBpmChange?: (id: string, bpm: number) => void;
  onOpenTuner?: (file: AudioFile) => void;
  onToggleSelect?: (id: string) => void;
  onFocus?: () => void;
  onTimeUpdate?: (id: string, time: number) => void;
  showCategoryInFilename?: boolean;
  showBpmOnTrack?: boolean;
  showKeyOnTrack?: boolean;
  showCategoryOnTrack?: boolean;
  showTunerOnTrack?: boolean;
  waveformColor?: string;
  theme?: string;
  categories?: CategoryRule[];
  resetOnStop?: boolean;
}

const AudioFileCardComponent = ({
  audioFile,
  onPlay,
  onPause,
  onRename,
  onDelete,
  onDurationUpdate,
  onCategoryChange,
  onKeyChange,
  onBpmChange,
  onOpenTuner,
  onToggleSelect,
  onFocus,
  onTimeUpdate,
  showCategoryInFilename = true,
  showBpmOnTrack = true,
  showKeyOnTrack = true,
  showCategoryOnTrack = true,
  showTunerOnTrack = true,
  waveformColor,
  theme,
  categories = [],
  resetOnStop = false,
}: AudioFileCardProps) => {
  // Build category list from props, always include "Other" as fallback
  const categoryList = useMemo(() => {
    const names = categories.map(c => c.name);
    if (!names.includes('Other')) {
      names.push('Other');
    }
    return names;
  }, [categories]);
  const categoryLookup = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => map.set(c.name.toLowerCase(), c.name));
    map.set('other', 'Other');
    return map;
  }, [categories]);
  const selectedCategory = categoryLookup.get((audioFile.category || 'Other').toLowerCase()) || 'Other';
  const [isEditing, setIsEditing] = useState(false);

  const showCategoryLabel = showCategoryInFilename && showCategoryOnTrack;

  const getBaseName = useCallback((name: string) => {
    const nameWithoutExt = name.replace(/\.[^/.]+$/, '');
    const shouldStripCategory = showCategoryInFilename || !showCategoryOnTrack;
    if (!shouldStripCategory) return nameWithoutExt;

    const category = (audioFile.category || 'Other').trim();
    if (!category) return nameWithoutExt;

    const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const categorySuffix = new RegExp(`\\s*\\(${escaped}\\)\\s*$`, 'i');
    return nameWithoutExt.replace(categorySuffix, '').trim();
  }, [audioFile.category, showCategoryInFilename, showCategoryOnTrack]);

  const [editedName, setEditedName] = useState(() => getBaseName(audioFile.name));
  const [isWaveformReady, setIsWaveformReady] = useState(() => !!audioFile.isWaveformReady || audioFile.duration > 0);
  const [isEditingBpm, setIsEditingBpm] = useState(false);
  const [bpmDraft, setBpmDraft] = useState(() => (typeof audioFile.bpm === 'number' ? String(Math.round(audioFile.bpm)) : ''));
  const handleTimeUpdate = useCallback((time: number) => {
    onTimeUpdate?.(audioFile.id, time);
  }, [audioFile.id, onTimeUpdate]);

  // Generate stable URL - memoize based on file identity, not the url string itself
  // This prevents the URL from changing references unnecessarily
  const audioUrl = useMemo(() => {
    if (audioFile.filePath) {
      return convertFileSrc(audioFile.filePath);
    }
    return audioFile.url;
  }, [audioFile.filePath, audioFile.url]);

  // Keep editedName in sync when audioFile.name changes (but don't override while editing)
  useEffect(() => {
    if (!isEditing) {
      setEditedName(getBaseName(audioFile.name));
    }
  }, [audioFile.name, isEditing, getBaseName]);

  useEffect(() => {
    if (audioFile.isWaveformReady || audioFile.duration > 0) {
      setIsWaveformReady(true);
    }
  }, [audioFile.isWaveformReady, audioFile.duration]);

  useEffect(() => {
    if (!isEditingBpm) {
      setBpmDraft(typeof audioFile.bpm === 'number' ? String(Math.round(audioFile.bpm)) : '');
    }
  }, [audioFile.bpm, isEditingBpm]);


  const handleNameSubmit = () => {
    const trimmed = editedName.trim();
    if (!trimmed) {
      setIsEditing(false);
      return;
    }

    // Determine extension to preserve
    const hasExt = /\.[^/.]+$/.test(trimmed);
    let extension = audioFile.name.match(/\.[^/.]+$/)?.[0];
    if (!extension) {
      extension = audioFile.file?.name.match(/\.[^/.]+$/)?.[0] || '.wav';
    }

    let finalName = trimmed;

    // If we are showing category in filename, append it
    if (showCategoryInFilename) {
      // Ensure we don't double append if user typed it (though we try to prevent that)
      // Actually, we just take the base name and append the category from metadata
      const category = audioFile.category || 'Other';
      finalName = `${trimmed} (${category})${extension}`;
    } else {
      finalName = hasExt ? trimmed : `${trimmed}${extension}`;
    }

    if (finalName !== audioFile.name) {
      onRename(audioFile.id, finalName);
    }
    setIsEditing(false);
  };

  const handleBpmSubmit = () => {
    if (!onBpmChange) {
      setIsEditingBpm(false);
      return;
    }
    const parsed = Math.round(Number(bpmDraft));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setIsEditingBpm(false);
      setBpmDraft(typeof audioFile.bpm === 'number' ? String(Math.round(audioFile.bpm)) : '');
      return;
    }
    onBpmChange(audioFile.id, parsed);
    setIsEditingBpm(false);
  };


  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (audioFile.isPlaying) {
      onPause(audioFile.id);
    } else {
      onPlay(audioFile.id);
    }
  };

  const handleWaveformReady = (duration: number) => {
    setIsWaveformReady(true);
    onDurationUpdate(audioFile.id, duration);
  };

  if (!isWaveformReady) {
    return (
      <div className="bg-gradient-card rounded-md border border-border/50 px-3 py-2">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground truncate">Loading {getBaseName(audioFile.name)}...</span>
        </div>
        <div className="h-0 overflow-hidden">
          <Waveform
            id={audioFile.id}
            audioUrl={audioFile.url}
            isPlaying={false}
            onReady={handleWaveformReady}
            onFinish={() => { }}
            isSilent={audioFile.isSilent}
            playbackSpeed={audioFile.playbackSpeed}
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-card rounded-md transition-all duration-200
                  border ${audioFile.isSilent ? 'border-destructive' :
          audioFile.isSelected ? 'border-primary' : 'border-border/50 hover:border-border'
        } px-3 py-2`}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={audioFile.isSelected || false}
            onChange={() => onToggleSelect(audioFile.id)}
            className="w-4 h-4 rounded border-border cursor-pointer flex-shrink-0"
          />
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlayPause}
          className="flex-shrink-0"
        >
          {audioFile.isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        {isEditing ? (
          <div className="w-[140px] sm:w-[200px] md:w-[250px] flex-shrink-0 flex items-center gap-1">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="flex-1 min-w-0"
            />
            {showCategoryLabel && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                ({audioFile.category || 'Other'})
              </span>
            )}
          </div>
        ) : (
          <h3
            className="w-[140px] sm:w-[200px] md:w-[250px] flex-shrink-0 font-semibold text-foreground hover:text-primary transition-colors cursor-pointer truncate flex items-center gap-1"
            onDoubleClick={() => setIsEditing(true)}
            title={audioFile.name}
          >
            <span className="truncate">{getBaseName(audioFile.name)}</span>
            {showCategoryLabel && (
              <span className="text-muted-foreground font-normal whitespace-nowrap">
                ({audioFile.category || 'Other'})
              </span>
            )}
          </h3>
        )}

        <div 
          className="flex-[5] min-w-0 h-[40px]" 
          onClick={onFocus}
          draggable
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Waveform
            id={audioFile.id}
            audioUrl={audioUrl}
            isPlaying={audioFile.isPlaying}
            onReady={handleWaveformReady}
            onFinish={() => onPause(audioFile.id)}
            isSilent={audioFile.isSilent}
            playbackSpeed={audioFile.playbackSpeed}
            peaks={audioFile.peaks}
            waveColor={waveformColor}
            theme={theme}
            resetOnStop={resetOnStop}
            onInteraction={onFocus}
            onTimeUpdate={handleTimeUpdate}
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Volume2 className="w-4 h-4" />
            <span className="font-mono">{formatDuration(audioFile.duration)}</span>
          </div>

          {showBpmOnTrack && (onBpmChange ? (
            isEditingBpm ? (
              <Input
                type="number"
                min="1"
                step="1"
                value={bpmDraft}
                onChange={(e) => setBpmDraft(e.target.value)}
                onBlur={handleBpmSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBpmSubmit();
                  if (e.key === 'Escape') {
                    setIsEditingBpm(false);
                    setBpmDraft(typeof audioFile.bpm === 'number' ? String(Math.round(audioFile.bpm)) : '');
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-16 px-2 text-xs font-mono"
                autoFocus
              />
            ) : (
              <Badge
                variant="secondary"
                className={`h-7 text-xs font-mono px-2 cursor-pointer ${audioFile.trackType === 'stem' && audioFile.bpm == null ? 'opacity-50' : ''}`}
                title={
                  typeof audioFile.bpm === 'number' && typeof audioFile.bpmConfidence === 'number'
                    ? `Confidence ${audioFile.bpmConfidence.toFixed(2)}`
                    : audioFile.trackType === 'stem' && audioFile.bpm == null
                      ? 'BPM detection skipped for stems. Click to set manually.'
                      : 'Click to set BPM'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingBpm(true);
                }}
              >
                {typeof audioFile.bpm === 'number' && Number.isFinite(audioFile.bpm)
                  ? `${Math.round(audioFile.bpm)} BPM`
                  : audioFile.trackType === 'stem'
                    ? 'Stem'
                    : 'Set BPM'}
              </Badge>
            )
          ) : (
            typeof audioFile.bpm === 'number' &&
            Number.isFinite(audioFile.bpm) && (
              <Badge
                variant="secondary"
                className="h-7 text-xs font-mono px-2"
                title={
                  typeof audioFile.bpmConfidence === 'number'
                    ? `Confidence ${audioFile.bpmConfidence.toFixed(2)}`
                    : undefined
                }
              >
                {Math.round(audioFile.bpm)} BPM
              </Badge>
            )
          ))}

          {showKeyOnTrack && (onKeyChange ? (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onDragStart={(e) => e.preventDefault()}
            >
              <KeyTreeSelector
                value={audioFile.key || ''}
                onChange={(key) => onKeyChange(audioFile.id, key)}
              />
            </div>
          ) : (
            audioFile.key && (
              <Badge variant="secondary" className="h-7 text-xs font-mono px-2">
                {audioFile.key}
              </Badge>
            )
          ))}

          {onOpenTuner && showTunerOnTrack && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs w-20"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenTuner(audioFile);
              }}
            >
              Tuner
            </Button>
          )}

          {showCategoryOnTrack && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs w-20 sm:w-28 justify-center px-1">
                  {selectedCategory || 'Category'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                {categoryList.map((cat) => (
                  <DropdownMenuItem
                    key={cat}
                    onClick={() => onCategoryChange(audioFile.id, cat)}
                    className="cursor-pointer"
                  >
                    {cat}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex items-center gap-2 w-[100px] justify-end">
            {audioFile.isDuplicate && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20">
                <Copy className="w-3 h-3" />
                Duplicate
              </Badge>
            )}

            {audioFile.isSilent && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Silent
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(audioFile.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const AudioFileCard = memo(AudioFileCardComponent);
