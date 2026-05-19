import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { FileUploadZone } from '@/components/FileUploadZone';
import { PulseLogo } from '@/components/PulseLogo';
import { AudioFileCard } from '@/components/AudioFileCard';
import { ChromaticTunerModal } from '@/components/ChromaticTunerModal';
import { Toolbar } from '@/components/Toolbar';
import { CategoryManager } from '@/components/CategoryManager';
import { SettingsDialog } from '@/components/SettingsDialog';
import { AudioFile } from '@/types/audio';
import { analyzeSilence, getAudioDuration, processAudioFile, detectKeyForFile, classifyTrackTypes, detectBpmForFile } from '@/utils/audioAnalysis';
import { matchesBinding } from '@/utils/keybindings';
import { applyAutoRenameAll, categorizeTrack } from '@/utils/renameUtils';
import { exportFilesAsZip } from '@/utils/exportUtils';
import { loadCategoryConfig, saveCategoryConfig, CategoryRule, loadSettings, saveSettings, AppSettings, DEFAULT_CATEGORIES, ExportFormat, FolderStructure, THEME_WAVEFORM_COLORS } from '@/utils/categoryConfig';
import { toast } from '@/components/ui/sonner';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { RenamePreviewDialog } from '@/components/RenamePreviewDialog';
import { OnboardingOverlay } from '@/components/OnboardingOverlay';
import { convertFileSrc } from '@tauri-apps/api/core';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const KEY_LABEL_SET = new Set(
  [
    'C','C#','D','D#','E','F','F#','G','G#','A','A#','B',
    'Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm',
    'Db','Eb','Gb','Ab','Bb',
    'Dbm','Ebm','Gbm','Abm','Bbm',
  ].map(k => k.toLowerCase()),
);

const normalizeKeyToken = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^([A-Ga-g])\s*([#b]?)(?:\s*(maj|major|min|minor|m))?$/);
  if (!match) return '';
  let note = match[1].toUpperCase() + (match[2] || '');
  const mode = (match[3] || '').toLowerCase();
  const flatMap: Record<string, string> = {
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#',
  };
  if (flatMap[note]) note = flatMap[note];
  const isMinor = mode === 'm' || mode === 'min' || mode === 'minor';
  return isMinor ? `${note}m` : note;
};

const resolveCategoryFromName = (name: string, fallbackCategory: string | undefined, rules: CategoryRule[]) => {
  const categoryMatch = name.match(/\(([^)]+)\)(?:\.[^.]+)?$/);
  const candidate = categoryMatch?.[1]?.trim();
  if (candidate) {
    const isKeyToken = KEY_LABEL_SET.has(candidate.toLowerCase()) || !!normalizeKeyToken(candidate);
    if (isKeyToken) {
      return fallbackCategory ?? categorizeTrack(name, rules);
    }
    const matchedCategory = rules.find(c => c.name.toLowerCase() === candidate.toLowerCase())?.name;
    if (matchedCategory) return matchedCategory;
  }
  return categorizeTrack(name, rules);
};

const stripTrailingTokens = (value: string) => {
  let next = value.trim();
  let prev = '';
  while (next !== prev) {
    prev = next;
    next = next.replace(/\s*\([^)]+\)\s*$/, '').replace(/\s*\[[^\]]+\]\s*$/, '').trim();
  }
  return next;
};

const removeSuffixIgnoreCase = (value: string, suffix: string) => {
  if (!suffix) return value;
  if (value.toLowerCase().endsWith(suffix.toLowerCase())) {
    return value.slice(0, value.length - suffix.length);
  }
  return value;
};

const deriveBaseName = (nameWithoutExt: string, category: string, keyValue: string, pattern: string) => {
  let baseName = stripTrailingTokens(nameWithoutExt);

  if (pattern.startsWith('{category} - ')) {
    const prefix = `${category} - `;
    if (baseName.toLowerCase().startsWith(prefix.toLowerCase())) {
      baseName = baseName.slice(prefix.length);
    }
  } else if (pattern.startsWith('{category}_')) {
    const prefix = `${category}_`;
    if (baseName.toLowerCase().startsWith(prefix.toLowerCase())) {
      baseName = baseName.slice(prefix.length);
    }
  }

  if (pattern.includes('_{category}')) {
    baseName = removeSuffixIgnoreCase(baseName, `_${category}`);
  }

  if (pattern.includes('_{key}') && keyValue) {
    baseName = removeSuffixIgnoreCase(baseName, `_${keyValue}`);
  }

  if (pattern.includes('{bpm}')) {
    baseName = baseName.replace(/[\s_-]*(?:\(|\[)?\s*\d{2,3}\s*bpm\s*(?:\)|\])?\s*$/i, '').trim();
  }

  return baseName.trim();
};

const sanitizePatternOutput = (value: string) => {
  let next = value;
  next = next.replace(/\s*\(\s*\)\s*/g, ' ');
  next = next.replace(/\s*\[\s*\]\s*/g, ' ');
  next = next.replace(/\s{2,}/g, ' ');
  next = next.replace(/\s*-\s*$/g, '');
  next = next.replace(/[_-]+$/g, '');
  return next.trim();
};

const formatBpmToken = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '';
  return `${Math.round(value)} BPM`;
};

const buildNameFromPattern = (
  file: AudioFile,
  pattern: string,
  overrides?: { category?: string; key?: string; bpm?: number; sourceName?: string; baseName?: string },
) => {
  const sourceName = overrides?.sourceName ?? file.name;
  const ext = sourceName.match(/\.[^/.]+$/)?.[0] || '';
  const nameWithoutExt = sourceName.replace(/\.[^/.]+$/, '');
  const category = overrides?.category ?? file.category ?? 'Other';
  const keyValue = (overrides?.key ?? file.key ?? '').trim();
  const bpmValue = overrides?.bpm ?? file.bpm;
  const baseName = overrides?.baseName ?? deriveBaseName(nameWithoutExt, category, keyValue, pattern);
  const bpmToken = formatBpmToken(bpmValue);

  const replaced = pattern
    .replace('{name}', baseName)
    .replace('{category}', category)
    .replace('{key}', keyValue)
    .replace('{bpm}', bpmToken);

  return sanitizePatternOutput(replaced) + ext;
};

const SUPPORTED_AUDIO_EXTENSIONS = ['.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac', '.wma'];

const getFileExtension = (name: string) => {
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1) return '';
  return name.slice(lastDot).toLowerCase();
};

const isSupportedAudioFile = (file: File) => {
  const ext = getFileExtension(file.name);
  if (SUPPORTED_AUDIO_EXTENSIONS.includes(ext)) return true;
  if (file.type && file.type.startsWith('audio/')) return true;
  return false;
};

const Index = () => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isKeyDetecting, setIsKeyDetecting] = useState(false);
  const [keyDetectionProgress, setKeyDetectionProgress] = useState(0);
  const [organizationMode, setOrganizationMode] = useState<'category' | 'alphabetical-asc' | 'alphabetical-desc' | 'import-order'>('import-order');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [focusedTrackId, setFocusedTrackId] = useState<string | null>(null);
  const [tunerFile, setTunerFile] = useState<AudioFile | null>(null);
  const [tunerStartOffset, setTunerStartOffset] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [categories, setCategories] = useState<CategoryRule[]>(loadCategoryConfig());
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [showExportAlert, setShowExportAlert] = useState(false);
  const [pendingExportFiles, setPendingExportFiles] = useState<AudioFile[]>([]);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat>('folder');
  const [pendingExportStructure, setPendingExportStructure] = useState<FolderStructure>('categorized');
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const handleCompleteOnboarding = useCallback(() => {
    const newSettings = { ...settings, hasCompletedOnboarding: true };
    setSettings(newSettings);
    saveSettings(newSettings);
    toast.success("You're all set!");
  }, [settings]);

  // Rename Preview & Undo State
  const [isRenamePreviewOpen, setIsRenamePreviewOpen] = useState(false);
  const [previewNewNames, setPreviewNewNames] = useState<string[]>([]);
  const [previewFiles, setPreviewFiles] = useState<AudioFile[]>([]);
  const [previewCategories, setPreviewCategories] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<{ state: AudioFile[]; label: string }[]>([]);

  const cancelAnalysisRef = useRef(false);
  const cancelKeyDetectionRef = useRef(false);
  const listParentRef = useRef<HTMLDivElement>(null);
  const audioFilesRef = useRef(audioFiles);
  const playbackPositionRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    audioFilesRef.current = audioFiles;
  }, [audioFiles]);

  const handlePlaybackPosition = useCallback((id: string, time: number) => {
    playbackPositionRef.current.set(id, time);
  }, []);


  useEffect(() => {
    setAudioFiles(prev => {
      const categoryNames = new Set(categories.map(c => c.name.toLowerCase()));
      let changed = false;
      const next = prev.map(file => {
        if (!file.category) return file;
        const normalized = file.category.toLowerCase();
        if (categoryNames.has(normalized)) return file;
        if (KEY_LABEL_SET.has(normalized)) {
          changed = true;
          return { ...file, category: 'Other' };
        }
        return file;
      });
      return changed ? next : prev;
    });
  }, [categories]);


  const addToHistory = useCallback((currentState: AudioFile[], label: string = 'Action') => {
    setUndoStack(prev => {
      const newStack = [...prev, { state: currentState, label }];
      if (newStack.length > settings.maxUndoHistory) {
        const evictCount = newStack.length - settings.maxUndoHistory;
        const evicted = newStack.slice(0, evictCount);
        const kept = newStack.slice(evictCount);

        // Collect all blob URLs still referenced by kept undo entries and current state
        const activeUrls = new Set<string>();
        for (const entry of kept) {
          for (const f of entry.state) {
            if (f.url?.startsWith('blob:')) activeUrls.add(f.url);
          }
        }
        for (const f of audioFilesRef.current) {
          if (f.url?.startsWith('blob:')) activeUrls.add(f.url);
        }

        // Revoke blob URLs from evicted entries that are no longer referenced
        for (const entry of evicted) {
          for (const f of entry.state) {
            if (f.url?.startsWith('blob:') && !activeUrls.has(f.url)) {
              URL.revokeObjectURL(f.url);
            }
          }
        }

        return kept;
      }
      return newStack;
    });
  }, [settings.maxUndoHistory]);

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      const newStack = prev.slice(0, prev.length - 1);
      setAudioFiles(entry.state);
      toast.success(`Undone: ${entry.label}`);
      return newStack;
    });
  }, []);

  // Keyboard shortcuts are consolidated in the effect below (after all handlers are defined)

  const fileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    audioFiles.forEach(f => {
      const catName = f.category || 'Other';
      const rule = categories.find(c => c.name === catName);
      if (rule) {
        counts[rule.id] = (counts[rule.id] || 0) + 1;
      }
    });
    return counts;
  }, [audioFiles, categories]);

  const handleSaveCategories = useCallback((newCategories: CategoryRule[], reassignments?: Record<string, string>) => {
    addToHistory([...audioFilesRef.current], 'Save categories');
    setCategories(newCategories);
    saveCategoryConfig(newCategories);

    // Re-categorize existing files
    setAudioFiles(prev => prev.map(file => {
      const currentCategoryName = file.category || 'Other';

      // Check for explicit reassignment
      if (reassignments && reassignments[currentCategoryName]) {
        const targetCategory = reassignments[currentCategoryName];
        let newName = file.name;

        // Rename file if it has the suffix or even if it doesn't (to enforce new category)
        // We'll strip any existing recognized category suffix and add the new one
        if (settings.namingPattern) {
          newName = buildNameFromPattern(file, settings.namingPattern, {
            category: targetCategory,
            key: file.key,
          });
        } else if (settings.includeCategoryInFilename) {
          const ext = file.name.match(/\.[^/.]+$/)?.[0] || '';
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          // Strip existing suffix
          const baseName = nameWithoutExt.replace(/\s*\([^)]+\)\s*$/, '').trim();
          if (targetCategory === 'Other') {
            newName = `${baseName}${ext}`;
          } else {
            newName = `${baseName} (${targetCategory})${ext}`;
          }
        }

        return { ...file, name: newName, category: targetCategory };
      }

      // Default logic for other files
      // Determine category
      const currentCategory = resolveCategoryFromName(file.name, file.category, newCategories);
      return { ...file, category: currentCategory };
    }));
  }, [settings, addToHistory]);

  const handleResetCategories = useCallback(() => {
    setCategories(DEFAULT_CATEGORIES);
    saveCategoryConfig(DEFAULT_CATEGORIES);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  const effectiveTheme = settings.theme === 'system'
    ? (systemPrefersDark ? 'default' : 'light')
    : settings.theme;
  const effectiveWaveformColor = settings.waveformColor || THEME_WAVEFORM_COLORS[effectiveTheme] || '#2dd4bf';

  // Apply theme and waveform color
  useEffect(() => {
    const root = window.document.documentElement;

    // Apply Theme
    if (effectiveTheme === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', effectiveTheme);
    }

    // Apply Waveform Color — always resolve a concrete color so waveforms
    // never fall back to the hardcoded blue default.
    root.style.setProperty('--waveform-wave', effectiveWaveformColor);
    root.style.setProperty('--waveform-progress', effectiveWaveformColor);

    // Notify components of theme change
    window.dispatchEvent(new CustomEvent('theme-change'));
  }, [effectiveTheme, effectiveWaveformColor]);

  const handleSaveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);

    // Update filenames based on new settings
    setAudioFiles(prev => prev.map(file => {
      const currentCategory = file.category || 'Other';
      const keyValue = file.key ?? '';
      let newName: string;
      if (newSettings.namingPattern) {
        newName = buildNameFromPattern(file, newSettings.namingPattern, {
          category: currentCategory,
          key: keyValue,
        });
      } else {
        const ext = file.name.match(/\.[^/.]+$/)?.[0] || '';
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const baseName = nameWithoutExt.replace(/\s*\([^)]+\)\s*$/, '').trim();
        // Fallback or legacy behavior
        if (newSettings.includeCategoryInFilename) {
          newName = `${baseName} (${currentCategory})${ext}`;
        } else {
          newName = `${baseName}${ext}`;
        }
      }
      return { ...file, name: newName };
    }));
  }, []);

  const handleOpenTuner = useCallback((file: AudioFile) => {
    const startOffset = file.isPlaying
      ? (playbackPositionRef.current.get(file.id) ?? 0)
      : 0;
    // Prevent double playback when opening the tuner
    setAudioFiles(prev => prev.map(f => (f.isPlaying ? { ...f, isPlaying: false } : f)));
    setTunerStartOffset(startOffset);
    setTunerFile(file);
  }, []);

  const handleFilesAdded = useCallback(async (files: File[]) => {
    const acceptedFiles = files.filter(isSupportedAudioFile);
    const rejectedCount = files.length - acceptedFiles.length;

    if (acceptedFiles.length === 0) {
      if (rejectedCount > 0) {
        toast.warning(`Skipped ${rejectedCount} unsupported file${rejectedCount === 1 ? '' : 's'}`);
      }
      setIsProcessingFiles(false);
      return;
    }

    if (rejectedCount > 0) {
      toast.warning(`Skipped ${rejectedCount} unsupported file${rejectedCount === 1 ? '' : 's'}`);
    }

    setIsProcessingFiles(true);
    setProcessingProgress(0);

    const newAudioFiles: AudioFile[] = acceptedFiles.map((file) => {
      // Check if the file has a path property (from Tauri drag & drop)
      const filePath = (file as File & { path?: string }).path;
      const url = filePath ? convertFileSrc(filePath) : URL.createObjectURL(file);

      const category = settings.enableAutoCategorization ? categorizeTrack(file.name, categories) : 'Other';
      let name = file.name;

      if (settings.autoRenameOnImport) {
        const ext = file.name.match(/\.[^/.]+$/)?.[0] || '';
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const baseName = nameWithoutExt.replace(/\s*\([^)]+\)\s*$/, '').trim();

        if (settings.namingPattern) {
          const replaced = settings.namingPattern
            .replace('{name}', baseName)
            .replace('{category}', category || 'Other')
            .replace('{key}', '')
            .replace('{bpm}', '');
          name = sanitizePatternOutput(replaced) + ext;
        } else if (settings.includeCategoryInFilename) {
          name = `${baseName} (${category || 'Other'})${ext}`;
        }
      }

      return {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        originalIndex: 0, // Will be updated before adding to state
        file,
        name,
        duration: 0,
        isSilent: false,
        isPlaying: false,
        volume: 0,
        url,
        filePath: filePath || undefined,
        category,
        key: undefined,
        isFavorite: false,
        playbackSpeed: 1,
        isSelected: false,
        isWaveformReady: false,
      };
    });

    // Process files in parallel with concurrency limit
    const concurrency = 4;
    let processedCount = 0;
    const totalFiles = newAudioFiles.length;




    const processFile = async (file: AudioFile) => {
      try {
        const { duration, peaks, hash, key, keyConfidence, bpm, bpmConfidence } = await processAudioFile(file.file, {
          detectKey: settings.enableKeyDetection,
          detectBpm: false, // BPM runs in a second pass after stem detection
          filePath: file.filePath,
        });
        return { ...file, duration, peaks, hash, key, keyConfidence, bpm, bpmConfidence, isWaveformReady: true };
      } catch (e) {
        console.error('Error processing file:', file.name, e);
        return { ...file, isWaveformReady: true };
      }
    };

    const chunks = [];
    for (let i = 0; i < newAudioFiles.length; i += concurrency) {
      chunks.push(newAudioFiles.slice(i, i + concurrency));
    }

    const processedFiles: AudioFile[] = [];
    // Use ref to get latest state without adding to dependency array
    const existingHashes = new Set(audioFilesRef.current.map(f => f.hash).filter(Boolean));
    const newHashes = new Set<string>();
    let duplicateCount = 0;

    for (const chunk of chunks) {
      const results = await Promise.all(chunk.map(processFile));
      
      for (const result of results) {
        if (result.hash) {
          if (existingHashes.has(result.hash) || newHashes.has(result.hash)) {
            result.isDuplicate = true;
            duplicateCount++;
          } else {
            newHashes.add(result.hash);
          }
        }
        if (settings.autoRenameOnImport && settings.namingPattern) {
          const currentCategory = result.category || 'Other';
          const keyValue = result.key ?? '';
          result.name = buildNameFromPattern(result, settings.namingPattern, {
            category: currentCategory,
            key: keyValue,
            sourceName: result.name,
          });
        }
        processedFiles.push(result);
      }

      processedCount += chunk.length;
      setProcessingProgress((processedCount / totalFiles) * 100);
    }

    if (duplicateCount > 0) {
      toast.info(`Detected ${duplicateCount} duplicate file${duplicateCount === 1 ? '' : 's'}`);
    }

    // Classify track types in batch (stems = 3+ files with same duration)
    const typeMap = classifyTrackTypes(processedFiles);
    for (const f of processedFiles) {
      f.trackType = typeMap.get(f.id);
    }

    // Second pass: run BPM detection for non-stems
    if (settings.enableBpmDetection) {
      const bpmTargets = processedFiles.filter(f => f.duration > 0 && f.duration < 120 && f.trackType !== 'stem');
      const bpmConcurrency = 4;
      let bpmFailures = 0;
      let bpmVcRuntimeError = false;
      for (let i = 0; i < bpmTargets.length; i += bpmConcurrency) {
        const batch = bpmTargets.slice(i, i + bpmConcurrency);
        const results = await Promise.all(
          batch.map(f => detectBpmForFile(f.file, f.filePath))
        );
        for (let j = 0; j < batch.length; j++) {
          batch[j].bpm = results[j].bpm;
          batch[j].bpmConfidence = results[j].bpmConfidence;
          if (results[j].error) {
            bpmFailures++;
            if (results[j].error.includes('VCRUNTIME_MISSING')) bpmVcRuntimeError = true;
          }
        }
      }
      if (bpmFailures > 0) {
        toast.warning(`BPM detection failed for ${bpmFailures} file${bpmFailures > 1 ? 's' : ''}`, {
          description: bpmVcRuntimeError
            ? 'Visual C++ Runtime is required. Download it from: aka.ms/vs/17/release/vc_redist.x64.exe'
            : 'Check the console for more details.',
          duration: 8000,
          icon: <AlertTriangle className="w-5 h-5" />,
        });
      }
    }

    setAudioFiles((prev) => {
      const startIndex = prev.length;
      const filesWithIndex = processedFiles.map((f, i) => ({
        ...f,
        originalIndex: startIndex + i
      }));

      // Prepend new files so they appear at the top
      const newAllFiles = [...filesWithIndex, ...prev];

      return newAllFiles;
    });
    setIsProcessingFiles(false);
    toast.success(`Added ${acceptedFiles.length} file${acceptedFiles.length > 1 ? 's' : ''}`);
  }, [categories, settings]);

  // Handle paste events to support copying files from file explorer and pasting into the app
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Don't handle paste if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        await handleFilesAdded(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFilesAdded]);

  const handlePlay = useCallback((id: string) => {
    setAudioFiles((prev) =>
      prev.map((file) => ({
        ...file,
        isPlaying: file.id === id ? true : false,
      }))
    );
  }, []);

  const handlePause = useCallback((id: string) => {
    setAudioFiles((prev) =>
      prev.map((file) =>
        file.id === id ? { ...file, isPlaying: false } : file
      )
    );
  }, []);

  const handleRename = useCallback((id: string, newName: string) => {
    addToHistory([...audioFilesRef.current], 'Rename');
    setAudioFiles((prev) =>
      prev.map((file) => {
        if (file.id === id) {
          const inferredCategory = resolveCategoryFromName(newName, file.category, categories);
          return {
            ...file,
            name: newName,
            category: inferredCategory,
            key: file.key,
          };
        }
        return file;
      })
    );
    toast.success('File renamed');
  }, [categories, addToHistory]);

  const handleKeyChange = useCallback((id: string, nextKey: string) => {
    addToHistory([...audioFilesRef.current], 'Key change');
    setAudioFiles(prev =>
      prev.map(file => {
        if (file.id !== id) return file;
        const updated = { ...file, key: nextKey };
        if (settings.namingPattern && settings.namingPattern.includes('{key}')) {
          updated.name = buildNameFromPattern(updated, settings.namingPattern, {
            key: nextKey,
          });
        }
        return updated;
      })
    );
    toast.success('Key updated');
  }, [addToHistory, settings]);

  const handleBpmChange = useCallback((id: string, bpm: number) => {
    addToHistory([...audioFilesRef.current], 'BPM change');
    setAudioFiles(prev =>
      prev.map(file => {
        if (file.id !== id) return file;
        const updated = { ...file, bpm, bpmConfidence: undefined };
        if (settings.namingPattern && settings.namingPattern.includes('{bpm}')) {
          updated.name = buildNameFromPattern(updated, settings.namingPattern, { bpm });
        }
        return updated;
      })
    );
    toast.success('BPM updated');
  }, [addToHistory, settings]);

  // Helper function to renumber files with incremented names (e.g., Fill_1, Fill_2, Fill_6 -> Fill_1, Fill_2, Fill_3)
  const renumberIncrementedFiles = useCallback((files: AudioFile[]): AudioFile[] => {
    // Group files by base name (name without _number suffix)
    const groups: Record<string, AudioFile[]> = {};
    
    files.forEach(file => {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const match = nameWithoutExt.match(/^(.+?)_(\d+)$/);
      
      if (match) {
        const baseName = match[1];
        if (!groups[baseName]) {
          groups[baseName] = [];
        }
        groups[baseName].push(file);
      }
    });

    // Renumber each group that has gaps
    const renamedFiles = [...files];
    Object.entries(groups).forEach(([baseName, groupFiles]) => {
      if (groupFiles.length > 1) {
        // Sort by current number
        groupFiles.sort((a, b) => {
          const aMatch = a.name.match(/_(\d+)(?:\.[^.]+)?$/);
          const bMatch = b.name.match(/_(\d+)(?:\.[^.]+)?$/);
          const aNum = aMatch ? parseInt(aMatch[1]) : 0;
          const bNum = bMatch ? parseInt(bMatch[1]) : 0;
          return aNum - bNum;
        });

        // Check if there are gaps in numbering
        const numbers = groupFiles.map(f => {
          const match = f.name.match(/_(\d+)(?:\.[^.]+)?$/);
          return match ? parseInt(match[1]) : 0;
        });
        
        const hasGaps = numbers.some((num, idx) => num !== idx + 1);
        
        if (hasGaps) {
          // Renumber sequentially
          groupFiles.forEach((file, idx) => {
            const ext = file.name.match(/\.[^/.]+$/)?.[0] || '.wav';
            const newName = `${baseName}_${idx + 1}${ext}`;
            const fileIndex = renamedFiles.findIndex(f => f.id === file.id);
            if (fileIndex !== -1 && renamedFiles[fileIndex].name !== newName) {
              renamedFiles[fileIndex] = { ...renamedFiles[fileIndex], name: newName };
            }
          });
        }
      }
    });

    return renamedFiles;
  }, []);

  const handleDelete = useCallback((id: string) => {
    addToHistory([...audioFilesRef.current], 'Delete track');
    // Notify waveform(s) to stop immediately, then remove from state
    try {
      window.dispatchEvent(new CustomEvent('stop-audio', { detail: { id } }));
    } catch (e) {
      // ignore error
    }

    setAudioFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        // Stop playback state before deleting
        if (file.isPlaying) {
          handlePause(id);
        }
        // Don't revoke blob URL here - it might be needed for undo
        // Blob URLs will be cleaned up when component unmounts or undo stack is cleared
      }
      const afterDelete = prev.filter((file) => file.id !== id);
      // Renumber any incremented files
      return renumberIncrementedFiles(afterDelete);
    });
    toast.success('File deleted');
  }, [handlePause, addToHistory, renumberIncrementedFiles]);

  const handleDurationUpdate = useCallback((id: string, duration: number) => {
    setAudioFiles((prev) => {
      const updated = prev.map((file) =>
        file.id === id
          ? { ...file, duration, isWaveformReady: true }
          : file
      );

      const typeMap = classifyTrackTypes(updated);
      let changed = false;

      const next = updated.map((file) => {
        const nextType = typeMap.get(file.id);
        if (!nextType || nextType === file.trackType) return file;

        changed = true;
        const nextFile = { ...file, trackType: nextType };
        if (nextType === 'stem' && typeof file.bpmConfidence === 'number') {
          nextFile.bpm = undefined;
          nextFile.bpmConfidence = undefined;
        }
        return nextFile;
      });

      return changed ? next : updated;
    });
  }, []);

  const handleAnalyzeSilence = useCallback(async () => {
    cancelAnalysisRef.current = false;
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Determine which files to analyze
    const selectedFiles = audioFiles.filter(f => f.isSelected);
    const filesToAnalyze = selectedFiles.length > 0 ? selectedFiles : audioFiles;

    let silentCount = 0;
    const totalFiles = filesToAnalyze.length;

    for (let i = 0; i < filesToAnalyze.length; i++) {
      if (cancelAnalysisRef.current) {
        setIsAnalyzing(false);
        toast.info('Analysis cancelled');
        return;
      }

      const file = filesToAnalyze[i];
      try {
        const isSilent = await analyzeSilence(file.file, file.filePath);

        setAudioFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, isSilent } : f
          )
        );

        if (isSilent) silentCount++;
        setAnalysisProgress(((i + 1) / totalFiles) * 100);
      } catch (error) {
        console.error('Error analyzing file:', file.name, error);
      }
    }

    setIsAnalyzing(false);

    if (silentCount > 0) {
      toast.warning('Silence analysis complete!', {
        description: `Found ${silentCount} silent track${silentCount > 1 ? 's' : ''}${selectedFiles.length > 0 ? ' in selection' : ''}`,
        icon: <AlertTriangle className="w-5 h-5" />
      });
    } else {
      toast.success('Silence analysis complete!', {
        description: `No silent tracks detected${selectedFiles.length > 0 ? ' in selection' : ''}`,
        icon: <CheckCircle2 className="w-5 h-5" />
      });
    }
  }, [audioFiles]);

  const handleCancelAnalysis = useCallback(() => {
    cancelAnalysisRef.current = true;
  }, []);

  const handleDetectKey = useCallback(async () => {
    if (!settings.enableKeyDetection) {
      toast.info('Enable key detection in settings to use this feature.');
      return;
    }

    cancelKeyDetectionRef.current = false;
    setIsKeyDetecting(true);
    setKeyDetectionProgress(0);

    const selectedFiles = audioFiles.filter(f => f.isSelected);
    const filesToAnalyze = selectedFiles.length > 0 ? selectedFiles : audioFiles;
    const shouldUpdateNames = !!settings.namingPattern && settings.namingPattern.includes('{key}');

    if (filesToAnalyze.length === 0) {
      setIsKeyDetecting(false);
      return;
    }

    addToHistory([...audioFilesRef.current], 'Auto detect key');

    let keyFailures = 0;
    let keySuccesses = 0;
    for (let i = 0; i < filesToAnalyze.length; i++) {
      if (cancelKeyDetectionRef.current) {
        setIsKeyDetecting(false);
        toast.info('Key detection cancelled');
        return;
      }

      const file = filesToAnalyze[i];
      const { key, keyConfidence, error } = await detectKeyForFile(file.file, file.filePath);

      if (error) {
        keyFailures++;
      } else if (key) {
        keySuccesses++;
      }

      setAudioFiles(prev =>
        prev.map(f => {
          if (f.id !== file.id) return f;
          const updated = { ...f, key, keyConfidence };
          if (shouldUpdateNames && settings.namingPattern) {
            updated.name = buildNameFromPattern(updated, settings.namingPattern, {
              key: key ?? updated.key ?? '',
            });
          }
          return updated;
        })
      );

      setKeyDetectionProgress(((i + 1) / filesToAnalyze.length) * 100);
    }

    setIsKeyDetecting(false);
    if (keyFailures > 0) {
      toast.warning(`Key detection failed for ${keyFailures} of ${filesToAnalyze.length} files`, {
        description: 'Some files could not be analyzed. Check the console for details.',
        duration: 6000,
        icon: <AlertTriangle className="w-5 h-5" />,
      });
    } else {
      toast.success('Key detection complete!', {
        description: `Processed ${filesToAnalyze.length} file${filesToAnalyze.length > 1 ? 's' : ''}${selectedFiles.length > 0 ? ' in selection' : ''}`,
        icon: <CheckCircle2 className="w-5 h-5" />
      });
    }
  }, [audioFiles, addToHistory, settings.enableKeyDetection, settings.namingPattern]);

  const handleCancelKeyDetection = useCallback(() => {
    cancelKeyDetectionRef.current = true;
  }, []);

  const handleCategoryChange = useCallback((id: string, newCategory: string) => {
    addToHistory([...audioFilesRef.current], 'Category change');
    setAudioFiles((prev) =>
      prev.map((file) => {
        if (file.id !== id) return file;

        // Update filename to reflect new category
        const ext = file.name.match(/\.[^/.]+$/)?.[0] || '';
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');

        // Remove old category if present (text in parentheses at the end)
        const baseNameWithoutCategory = nameWithoutExt.replace(/\s*\([^)]+\)\s*$/, '').trim();

        const keyValue = file.key ?? '';
        let newName: string;
        if (settings.namingPattern) {
          newName = buildNameFromPattern(file, settings.namingPattern, {
            category: newCategory,
            key: keyValue,
          });
        } else if (settings.includeCategoryInFilename) {
          newName = `${baseNameWithoutCategory} (${newCategory})${ext}`;
        } else {
          newName = `${baseNameWithoutCategory}${ext}`;
        }

        return { ...file, name: newName, category: newCategory };
      })
    );
    toast.success('Category changed');
  }, [addToHistory, settings]);

  const handleAutoRename = useCallback(() => {
    const selectedFiles = audioFiles.filter(f => f.isSelected);
    
    // If there are selected files, only rename those. Otherwise, rename all files.
    const filesToRename = selectedFiles.length > 0 ? selectedFiles : audioFiles;
    
    const filenames = filesToRename.map(f => f.name);
    const newNames = applyAutoRenameAll(filenames, categories);

    const computedCategories: string[] = [];
    const finalNames = filesToRename.map((file, index) => {
      let newName = newNames[index];
      const ext = newName.match(/\.[^/.]+$/)?.[0] || '';
      const nameWithoutExt = newName.replace(/\.[^/.]+$/, '');
      const categoryMatch = nameWithoutExt.match(/\(([^)]+)\)\s*$/);
      const candidate = categoryMatch?.[1]?.trim();
      const detectedCategory = candidate && !KEY_LABEL_SET.has(candidate.toLowerCase())
        ? candidate
        : categorizeTrack(newName, categories);
      computedCategories.push(detectedCategory || 'Other');
      const baseName = stripTrailingTokens(nameWithoutExt);
      const keyValue = file.key ?? '';

      if (settings.namingPattern) {
        newName = buildNameFromPattern(file, settings.namingPattern, {
          category: detectedCategory || 'Other',
          key: keyValue,
          sourceName: newName,
          baseName,
        });
      } else if (!settings.includeCategoryInFilename) {
        newName = baseName + ext;
      }
      return newName;
    });

    setPreviewNewNames(finalNames);
    setPreviewFiles(filesToRename);
    setPreviewCategories(computedCategories);
    setIsRenamePreviewOpen(true);
  }, [audioFiles, categories, settings]);

  const handleConfirmRename = useCallback(() => {
    addToHistory([...audioFiles], 'Auto rename');

    setAudioFiles((prev) => {
      let renamedCount = 0;
      const fileIdsToRename = new Set(previewFiles.map(f => f.id));
      
      const newFiles = prev.map((file) => {
        if (!fileIdsToRename.has(file.id)) {
          return file; // Don't rename files not in the preview list
        }
        
        const previewIndex = previewFiles.findIndex(f => f.id === file.id);
        const newName = previewNewNames[previewIndex];
        
        // Extract category from the new name (text in parentheses)
        // e.g. "Kick (Drums).wav" -> "Drums"
        const newCategory = previewCategories[previewIndex] || categorizeTrack(newName, categories);

        if (newName !== file.name) renamedCount++;

        return { ...file, name: newName, category: newCategory };
      });

      if (renamedCount > 0) {
        toast.success('Tracks successfully renamed!', {
          description: `${renamedCount} file${renamedCount > 1 ? 's were' : ' was'} renamed`,
          icon: <CheckCircle2 className="w-5 h-5" />
        });
      } else {
        toast.info('No changes needed', {
          description: 'Files already follow naming conventions'
        });
      }

      return newFiles;
    });
    setIsRenamePreviewOpen(false);
    setPreviewCategories([]);
  }, [audioFiles, previewNewNames, previewFiles, previewCategories, categories, addToHistory]);

  useEffect(() => {
    if (!isRenamePreviewOpen) {
      setPreviewCategories([]);
    }
  }, [isRenamePreviewOpen]);

  const handleDeleteSilent = useCallback(() => {
    addToHistory([...audioFilesRef.current], 'Delete silent tracks');
    const silentFiles = audioFilesRef.current.filter((f) => f.isSilent);
    // Stop any silent files that might be playing
    silentFiles.forEach((file) => {
      try { window.dispatchEvent(new CustomEvent('stop-audio', { detail: { id: file.id } })); } catch (e) { /* ignore */ }
    });

    setAudioFiles((prev) => {
      const afterDelete = prev.filter((file) => !file.isSilent);
      return renumberIncrementedFiles(afterDelete);
    });
    toast.success(`Deleted ${silentFiles.length} silent track${silentFiles.length !== 1 ? 's' : ''}`);
  }, [addToHistory, renumberIncrementedFiles]);

  const handleDeleteDuplicates = useCallback(() => {
    addToHistory([...audioFilesRef.current], 'Remove duplicates');
    const duplicateFiles = audioFilesRef.current.filter((f) => f.isDuplicate);
    // Stop any duplicate files that might be playing
    duplicateFiles.forEach((file) => {
      try { window.dispatchEvent(new CustomEvent('stop-audio', { detail: { id: file.id } })); } catch (e) { /* ignore */ }
    });

    setAudioFiles((prev) => {
      const afterDelete = prev.filter((file) => !file.isDuplicate);
      return renumberIncrementedFiles(afterDelete);
    });
    toast.success(`Removed ${duplicateFiles.length} duplicate track${duplicateFiles.length !== 1 ? 's' : ''}`);
  }, [addToHistory, renumberIncrementedFiles]);

  const cancelExportRef = useRef<AbortController | null>(null);

  const handleCancelExport = useCallback(() => {
    if (cancelExportRef.current) {
      cancelExportRef.current.abort();
      cancelExportRef.current = null;
      setIsExporting(false);
      setExportProgress(0);
      toast.info('Export cancelled');
    }
  }, []);

  const performExport = useCallback(async (
    files: AudioFile[],
    options: { exportFormat: ExportFormat; folderStructure: FolderStructure }
  ) => {
    setIsExporting(true);
    setExportProgress(0);

    cancelExportRef.current = new AbortController();

    const exportSettings = { ...settings, exportFormat: options.exportFormat, folderStructure: options.folderStructure };

    try {
      const result = await exportFilesAsZip(
        files,
        (current, total) => {
          setExportProgress((current / total) * 100);
        },
        cancelExportRef.current.signal,
        exportSettings
      );

      if (result.success) {
        const fmt = options.exportFormat === 'zip' ? 'ZIP archive' : 'folder';
        const struct = options.folderStructure === 'categorized' ? ' organized by category' : '';
        toast.success(`Exported ${files.length} file${files.length > 1 ? 's' : ''} to ${fmt}${struct}!`);
      }
      // If cancelled by user (folder dialog dismissed), don't show any toast
    } catch (error) {
      const err = error as { name?: string; message?: string };
      if (err.message === 'Export cancelled' || err.name === 'AbortError') {
        // Handled by handleCancelExport or just ignore
      } else {
        toast.error('Failed to export files');
        console.error('Export error:', error);
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      cancelExportRef.current = null;
      setPendingExportFiles([]);
    }
  }, [settings]);

  const handleExport = useCallback(() => {
    // If files are selected, export ONLY those (even if silent, user choice).
    // If NO files are selected, export ALL NON-SILENT files (default behavior).
    const selectedFiles = audioFiles.filter((f) => f.isSelected);
    const filesToExport = selectedFiles.length > 0
      ? selectedFiles
      : audioFiles.filter((f) => !f.isSilent);

    if (filesToExport.length === 0) {
      toast.error('No files to export');
      return;
    }

    // Show export options dialog — user picks format + structure before proceeding
    setPendingExportFiles(filesToExport);
    setPendingExportFormat(settings.exportFormat);
    setPendingExportStructure(settings.folderStructure);
    setShowExportOptions(true);
  }, [audioFiles, settings.exportFormat, settings.folderStructure]);

  const handleExportOptionsConfirm = useCallback(() => {
    setShowExportOptions(false);

    // Only warn about "Other" category when using categorized structure
    // (in flat mode everything goes in one folder, so "Other" is not an issue)
    if (pendingExportStructure === 'categorized') {
      const hasOtherCategory = pendingExportFiles.some(f =>
        !f.category || f.category === 'Other' || f.category === 'other'
      );
      if (hasOtherCategory) {
        setShowExportAlert(true);
        return;
      }
    }

    performExport(pendingExportFiles, { exportFormat: pendingExportFormat, folderStructure: pendingExportStructure });
  }, [pendingExportFiles, pendingExportFormat, pendingExportStructure, performExport]);

  const handleOrganizationChange = useCallback((mode: 'category' | 'alphabetical-asc' | 'alphabetical-desc' | 'import-order') => {
    setOrganizationMode(mode);

    setAudioFiles((prev) => {
      const sorted = [...prev];

      const sortByCategory = (files: AudioFile[]) => {
        return files.sort((a, b) => {
          const catA = (a.category || 'Other').toLowerCase();
          const catB = (b.category || 'Other').toLowerCase();

          // Find index in our custom category list
          const indexA = categories.findIndex(c => c.name.toLowerCase() === catA);
          const indexB = categories.findIndex(c => c.name.toLowerCase() === catB);

          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;

          return catA.localeCompare(catB);
        });
      };

      switch (mode) {
        case 'category':
          return sortByCategory(sorted);
        case 'alphabetical-asc':
          return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'alphabetical-desc':
          return sorted.sort((a, b) => b.name.localeCompare(a.name));
        case 'import-order':
          // Newest first
          return sorted.sort((a, b) => (b.originalIndex ?? 0) - (a.originalIndex ?? 0));
        default:
          return sorted;
      }
    });

    const modeLabels = {
      'category': 'Grouped by category',
      'alphabetical-asc': 'Sorted alphabetically (A-Z)',
      'alphabetical-desc': 'Sorted alphabetically (Z-A)',
      'import-order': 'Restored import order'
    };

    toast.success('View updated', {
      description: modeLabels[mode],
      icon: <CheckCircle2 className="w-5 h-5" />
    });
  }, [categories]);

  // New handlers for additional features
  const handleToggleFavorite = useCallback((id: string) => {
    setAudioFiles((prev) =>
      prev.map((file) =>
        file.id === id ? { ...file, isFavorite: !file.isFavorite } : file
      )
    );
  }, []);

  const handlePlaybackSpeedChange = useCallback((id: string, speed: number) => {
    setAudioFiles((prev) =>
      prev.map((file) =>
        file.id === id ? { ...file, playbackSpeed: speed } : file
      )
    );
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setAudioFiles((prev) =>
      prev.map((file) =>
        file.id === id ? { ...file, isSelected: !file.isSelected } : file
      )
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setAudioFiles((prev) => prev.map((file) => ({ ...file, isSelected: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setAudioFiles((prev) => prev.map((file) => ({ ...file, isSelected: false })));
  }, []);

  const handleDeleteSelected = useCallback(() => {
    addToHistory([...audioFilesRef.current], 'Delete selected');
    setAudioFiles((prev) => {
      const selectedFiles = prev.filter((f) => f.isSelected);

      selectedFiles.forEach((file) => {
        try { window.dispatchEvent(new CustomEvent('stop-audio', { detail: { id: file.id } })); } catch (e) { /* ignore */ }
        // Stop playback state before deleting
        if (file.isPlaying) {
          handlePause(file.id);
        }
        // Don't revoke blob URL - it might be needed for undo
      });

      const afterDelete = prev.filter((file) => !file.isSelected);
      // Renumber any incremented files
      const renumbered = renumberIncrementedFiles(afterDelete);
      toast.success(`Deleted ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`);
      return renumbered;
    });
  }, [handlePause, addToHistory, renumberIncrementedFiles]);

  const handleBatchCategorize = useCallback((category: string) => {
    addToHistory([...audioFilesRef.current], 'Batch categorize');
    setAudioFiles((prev) =>
      prev.map((file) =>
        file.isSelected ? { ...file, category } : file
      )
    );
    toast.success('Category updated for selected files');
  }, [addToHistory]);

  const handleReverseRename = useCallback(() => {
    addToHistory([...audioFilesRef.current], 'Restore original names');
    setAudioFiles((prev) => {
      const selectedFiles = prev.filter((f) => f.isSelected);

      if (selectedFiles.length === 0) {
        toast.error('No files selected');
        return prev;
      }

      let reversedCount = 0;
      const newFiles = prev.map((file) => {
        if (!file.isSelected) return file;

        // Restore to original filename from the File object
        const originalName = file.file.name;

        if (originalName !== file.name) {
          reversedCount++;
          // Re-categorize based on original name
          const newCategory = resolveCategoryFromName(originalName, file.category, categories);
          return { ...file, name: originalName, category: newCategory };
        }

        return file;
      });

      if (reversedCount > 0) {
        toast.success('Original names restored!', {
          description: `${reversedCount} file${reversedCount > 1 ? 's were' : ' was'} restored`,
          icon: <CheckCircle2 className="w-5 h-5" />
        });
      } else {
        toast.info('No changes needed', {
          description: 'Selected files already have original names'
        });
      }

      return newFiles;
    });
  }, [categories, addToHistory]);

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setAudioFiles((prev) => {
      const newFiles = [...prev];
      const draggedFile = newFiles[draggedIndex];
      newFiles.splice(draggedIndex, 1);
      newFiles.splice(index, 0, draggedFile);
      return newFiles;
    });
    setDraggedIndex(index);
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  // Consolidated keyboard shortcuts (uses customizable keybindings from settings)
  useEffect(() => {
    const kb = settings.keybindings;

    const handleKeyPress = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = ['INPUT', 'TEXTAREA'].includes(tag) || (e.target as HTMLElement).isContentEditable;
      const mod = e.ctrlKey || e.metaKey;

      // Block browser refresh (F5, Ctrl+R, Ctrl+Shift+R) — always on, not customizable
      if (e.key === 'F5' || (mod && e.key === 'r')) {
        e.preventDefault();
        return;
      }

      // --- Modifier shortcuts (work even in inputs for some) ---

      if (matchesBinding(e, kb.undo)) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (matchesBinding(e, kb.search)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // --- Shortcuts that only work outside inputs ---

      if (matchesBinding(e, kb.selectAll) && !isInput) {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      if (matchesBinding(e, kb.export) && !isInput) {
        e.preventDefault();
        handleExport();
        return;
      }

      if (isInput) return;

      // Play/Pause
      if (matchesBinding(e, kb.play)) {
        if (tunerFile) return;
        e.preventDefault();

        if (focusedTrackId) {
          const focusedTrack = audioFiles.find((f) => f.id === focusedTrackId);
          if (focusedTrack) {
            if (focusedTrack.isPlaying) {
              handlePause(focusedTrackId);
            } else {
              handlePlay(focusedTrackId);
            }
          }
        } else {
          const playingFile = audioFiles.find((f) => f.isPlaying);
          if (playingFile) {
            handlePause(playingFile.id);
          } else if (audioFiles.length > 0) {
            handlePlay(audioFiles[0].id);
          }
        }
        return;
      }

      // Delete selected
      if (matchesBinding(e, kb.deleteSelected) || (kb.deleteSelected === 'Delete' && e.key === 'Backspace')) {
        const hasSelected = audioFiles.some((f) => f.isSelected);
        if (hasSelected) {
          e.preventDefault();
          handleDeleteSelected();
        }
        return;
      }

      // Deselect all
      if (matchesBinding(e, kb.deselectAll)) {
        e.preventDefault();
        handleDeselectAll();
        return;
      }

      // Auto Rename
      if (matchesBinding(e, kb.autoRename)) {
        e.preventDefault();
        handleAutoRename();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [audioFiles, focusedTrackId, settings.keybindings, handleSelectAll, handleDeselectAll, handleDeleteSelected, handlePause, handlePlay, handleUndo, handleExport, handleAutoRename, tunerFile]);

  // Filter files based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return audioFiles;

    const query = searchQuery.toLowerCase();
    return audioFiles.filter((file) =>
      file.name.toLowerCase().includes(query) ||
      file.category?.toLowerCase().includes(query) ||
      file.key?.toLowerCase().includes(query)
    );
  }, [audioFiles, searchQuery]);

  // Memoized index map for O(1) lookup performance in drag-and-drop
  const audioFileIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    audioFiles.forEach((f, i) => map.set(f.id, i));
    return map;
  }, [audioFiles]);

  const waveformReadyCount = useMemo(() => {
    return audioFiles.reduce((count, file) => (file.isWaveformReady ? count + 1 : count), 0);
  }, [audioFiles]);

  const silentCount = audioFiles.filter((f) => f.isSilent).length;
  const duplicateCount = audioFiles.filter((f) => f.isDuplicate).length;
  const selectedCount = audioFiles.filter((f) => f.isSelected).length;

  // Group files by category for organized view
  const groupedFiles = filteredFiles.reduce((acc, file) => {
    const category = file.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(file);
    return acc;
  }, {} as Record<string, AudioFile[]>);

  const allCategories = Object.keys(groupedFiles);

  const isOrganizedView = organizationMode === 'category';

  // Sort categories by their order in the category config, with unknown categories at the end
  const sortedCategories = [...allCategories].sort((a, b) => {
    const indexA = categories.findIndex(c => c.name.toLowerCase() === a.toLowerCase());
    const indexB = categories.findIndex(c => c.name.toLowerCase() === b.toLowerCase());
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-5 text-center">
          <div className="flex items-center justify-center gap-3 mb-1">
            <PulseLogo className="h-10 w-10" />
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Pulse
            </h1>
          </div>
          {audioFiles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Upload, analyze, clean, and organize your audio samples
            </p>
          )}
        </header>

        {isProcessingFiles ? (
          <LoadingScreen progress={processingProgress} />
        ) : (
          <>
            <div className="mb-6 space-y-4">
              <Toolbar
                ref={searchInputRef}
                onAnalyzeSilence={handleAnalyzeSilence}
                onDetectKey={handleDetectKey}
                onAutoRename={handleAutoRename}
                onExport={handleExport}
                onDeleteSilent={handleDeleteSilent}
                duplicateCount={duplicateCount}
                onDeleteDuplicates={handleDeleteDuplicates}
                onOrganizationChange={handleOrganizationChange}
                organizationMode={organizationMode}
                fileCount={audioFiles.length}
                silentCount={silentCount}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCount={selectedCount}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onDeleteSelected={handleDeleteSelected}
                onBatchCategorize={handleBatchCategorize}
                onReverseRename={handleReverseRename}
                onUndo={handleUndo}
                canUndo={undoStack.length > 0}
                categories={categories}
                onSaveCategories={handleSaveCategories}
                fileCounts={fileCounts}
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onResetCategories={handleResetCategories}
              />
              {isAnalyzing && (
                <div className="bg-gradient-card rounded-lg p-4 shadow-card border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Analyzing audio files...</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{Math.round(analysisProgress)}%</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelAnalysis}
                        className="h-7"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  <Progress value={analysisProgress} className="h-2" />
                </div>
              )}
              {isKeyDetecting && (
                <div className="bg-gradient-card rounded-lg p-4 shadow-card border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Detecting keys...</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{Math.round(keyDetectionProgress)}%</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelKeyDetection}
                        className="h-7"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  <Progress value={keyDetectionProgress} className="h-2" />
                </div>
              )}
              {isExporting && (
                <div className="bg-gradient-card rounded-lg p-4 shadow-card border border-primary/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm font-medium text-foreground">Exporting files...</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{Math.round(exportProgress)}%</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelExport}
                        className="h-7"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  <Progress value={exportProgress} className="h-2" />
                </div>
              )}
            </div>

            {audioFiles.length === 0 ? (
              <FileUploadZone 
                onFilesAdded={handleFilesAdded} 
                disabled={!settings.hasCompletedOnboarding}
              />
            ) : (
              <>
                <div className="mb-4">
                  <FileUploadZone onFilesAdded={handleFilesAdded} compact />
                </div>

                {isOrganizedView ? (
                  <div className="space-y-8">
                    {sortedCategories.map((category) => (
                      <div key={category} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-semibold text-foreground capitalize">
                            {category}
                          </h2>
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-sm text-muted-foreground">
                            {groupedFiles[category].length} file{groupedFiles[category].length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {groupedFiles[category].map((audioFile) => {
                            const globalIndex = audioFileIndexMap.get(audioFile.id) ?? -1;
                            return (
                            <div
                              key={audioFile.id}
                              draggable
                              onDragStart={() => handleDragStart(globalIndex)}
                              onDragOver={(e) => handleDragOver(e, globalIndex)}
                              onDragEnd={handleDragEnd}
                            >
                              <AudioFileCard
                                audioFile={audioFile}
                                onPlay={handlePlay}
                                onPause={handlePause}
                                onRename={handleRename}
                                onDelete={handleDelete}
                                onDurationUpdate={handleDurationUpdate}
                                onCategoryChange={handleCategoryChange}
                                onKeyChange={handleKeyChange}
                                onBpmChange={handleBpmChange}
                                onOpenTuner={handleOpenTuner}
                                onTimeUpdate={handlePlaybackPosition}
                                onToggleSelect={handleToggleSelect}
                                onFocus={() => setFocusedTrackId(audioFile.id)}
                                showBpmOnTrack={settings.showBpmOnTrack}
                                showKeyOnTrack={settings.showKeyOnTrack}
                                showCategoryOnTrack={settings.showCategoryOnTrack}
                                showTunerOnTrack={settings.showTunerOnTrack}
                                showCategoryInFilename={
                                  settings.includeCategoryInFilename &&
                                  (!settings.namingPattern || settings.namingPattern.includes('{category}'))
                                }
                                theme={effectiveTheme}
                                waveformColor={effectiveWaveformColor}
                                categories={categories}
                                resetOnStop={settings.resetPositionOnStop}
                              />
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredFiles.map((audioFile, index) => {
                      const globalIndex = audioFileIndexMap.get(audioFile.id) ?? -1;
                      return (
                        <div
                          key={audioFile.id}
                          draggable
                          onDragStart={() => handleDragStart(globalIndex)}
                          onDragOver={(e) => handleDragOver(e, globalIndex)}
                          onDragEnd={handleDragEnd}
                        >
                          <AudioFileCard
                            audioFile={audioFile}
                            onPlay={handlePlay}
                            onPause={handlePause}
                            onRename={handleRename}
                            onDelete={handleDelete}
                            onDurationUpdate={handleDurationUpdate}
                            onCategoryChange={handleCategoryChange}
                            onKeyChange={handleKeyChange}
                            onBpmChange={handleBpmChange}
                            onOpenTuner={handleOpenTuner}
                            onTimeUpdate={handlePlaybackPosition}
                            onToggleSelect={handleToggleSelect}
                            onFocus={() => setFocusedTrackId(audioFile.id)}
                            showBpmOnTrack={settings.showBpmOnTrack}
                            showKeyOnTrack={settings.showKeyOnTrack}
                            showCategoryOnTrack={settings.showCategoryOnTrack}
                            showTunerOnTrack={settings.showTunerOnTrack}
                            showCategoryInFilename={
                              settings.includeCategoryInFilename &&
                              (!settings.namingPattern || settings.namingPattern.includes('{category}'))
                            }
                            theme={effectiveTheme}
                            waveformColor={effectiveWaveformColor}
                            categories={categories}
                            resetOnStop={settings.resetPositionOnStop}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
        {tunerFile && (
          <ChromaticTunerModal
            file={tunerFile.file}
            startOffset={tunerStartOffset}
            waveformPeaks={tunerFile.peaks?.[0]}
            initialDuration={tunerFile.duration}
            waveformColor={effectiveWaveformColor}
            onClose={() => setTunerFile(null)}
            onKeyConfirmed={(key) => {
              handleKeyChange(tunerFile.id, key);
              setTunerFile(null);
            }}
          />
        )}
        <RenamePreviewDialog
          open={isRenamePreviewOpen}
          onOpenChange={setIsRenamePreviewOpen}
          files={previewFiles}
          newNames={previewNewNames}
          onConfirm={handleConfirmRename}
        />
        <AlertDialog open={showExportAlert} onOpenChange={setShowExportAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Uncategorized Tracks Detected</AlertDialogTitle>
              <AlertDialogDescription>
                Some tracks are in the "Other" category. Do you want to export them into an "Other" folder?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowExportAlert(false);
                setPendingExportFiles([]);
              }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowExportAlert(false);
                performExport(pendingExportFiles, { exportFormat: pendingExportFormat, folderStructure: pendingExportStructure });
              }}>
                Yes, Export All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showExportOptions} onOpenChange={setShowExportOptions}>
          <DialogContent className="sm:max-w-[340px]">
            <DialogHeader>
              <DialogTitle>Export Options</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Format</Label>
                <RadioGroup
                  value={pendingExportFormat}
                  onValueChange={(v) => setPendingExportFormat(v as ExportFormat)}
                  className="space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="folder" id="exp-folder" />
                    <Label htmlFor="exp-folder" className="font-normal cursor-pointer">Copy to folder</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="zip" id="exp-zip" />
                    <Label htmlFor="exp-zip" className="font-normal cursor-pointer">ZIP archive</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Structure</Label>
                <RadioGroup
                  value={pendingExportStructure}
                  onValueChange={(v) => setPendingExportStructure(v as FolderStructure)}
                  className="space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="categorized" id="exp-cat" />
                    <Label htmlFor="exp-cat" className="font-normal cursor-pointer">Organize into category subfolders</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flat" id="exp-flat" />
                    <Label htmlFor="exp-flat" className="font-normal cursor-pointer">All in one folder</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowExportOptions(false);
                  setPendingExportFiles([]);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleExportOptionsConfirm}>Export</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {!settings.hasCompletedOnboarding && (
          <OnboardingOverlay 
            onComplete={handleCompleteOnboarding} 
            onSkip={handleCompleteOnboarding}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
