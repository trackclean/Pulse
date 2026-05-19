import { useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';
import { getAudioContext } from '@/utils/audioAnalysis';
import { useTauriDragDrop } from '@/hooks/useTauriDragDrop';

// Keep in sync with Tauri drag/drop support.
const SUPPORTED_AUDIO_EXTENSIONS = ['.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac', '.wma'];
const AUDIO_MIME_TYPES: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wma': 'audio/x-ms-wma',
};

const getFileExtension = (path: string): string => {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '';
  return path.slice(lastDot).toLowerCase();
};

const getFileName = (path: string): string => {
  const lastSep = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return lastSep === -1 ? path : path.slice(lastSep + 1);
};

const pathToFile = (path: string): File => {
  const ext = getFileExtension(path);
  const mimeType = AUDIO_MIME_TYPES[ext] || 'application/octet-stream';
  const fileName = getFileName(path);
  const blob = new Blob([], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });
  Object.defineProperty(file, 'path', {
    value: path,
    writable: false,
    enumerable: true,
    configurable: false
  });
  return file;
};

interface FileUploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const FileUploadZone = ({ onFilesAdded, disabled = false, compact = false }: FileUploadZoneProps) => {
  // Listen for Tauri native drag and drop events (files dragged from OS file explorer)
  useTauriDragDrop(disabled ? () => {} : onFilesAdded);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowse = useCallback(async (e: React.MouseEvent<HTMLLabelElement>) => {
    if (disabled) return;
    e.preventDefault();

    // Initialize AudioContext on user interaction
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selection = await open({
        multiple: true,
        directory: false,
        filters: [
          { name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'flac', 'm4a', 'aac', 'wma'] },
        ],
      });

      if (!selection) {
        return;
      }

      const paths = Array.isArray(selection) ? selection : [selection];
      const files = paths
        .filter((p) => SUPPORTED_AUDIO_EXTENSIONS.includes(getFileExtension(p)))
        .map(pathToFile);

      if (files.length > 0) {
        onFilesAdded(files);
      }
      return;
    } catch {
      // Fall back to browser file input
      fileInputRef.current?.click();
    }
  }, [disabled, onFilesAdded]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;
      
      // Initialize AudioContext on user interaction
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const files = Array.from(e.dataTransfer.files).filter(
        (file) => file.type.startsWith('audio/') || 
        /\.(wav|mp3|ogg|flac|m4a|aac|wma)$/i.test(file.name)
      );
      if (files.length > 0) {
        onFilesAdded(files);
      }
    },
    [onFilesAdded, disabled]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      // Initialize AudioContext on user interaction
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFilesAdded(files);
      }
    },
    [onFilesAdded, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`border-2 border-dashed border-border rounded-lg text-center
                 transition-all duration-300 bg-gradient-card shadow-card group
                 ${compact ? 'p-3' : 'p-12'}
                 ${disabled
                   ? 'opacity-50 cursor-not-allowed grayscale'
                   : 'hover:border-primary cursor-pointer'}`}
    >
      <input
        type="file"
        id="file-upload"
        ref={fileInputRef}
        multiple
        accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a,.aac,.wma"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
      <label
        htmlFor="file-upload"
        onClick={handleBrowse}
        className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
      >
        {compact ? (
          <div className="flex items-center justify-center gap-2">
            <Upload className={`w-4 h-4 text-muted-foreground transition-colors ${!disabled && 'group-hover:text-primary'}`} />
            <span className={`text-sm text-muted-foreground transition-colors ${!disabled && 'group-hover:text-foreground'}`}>
              Drop files here or click to add more
            </span>
          </div>
        ) : (
          <>
            <Upload className={`w-16 h-16 mx-auto mb-4 text-muted-foreground transition-colors ${!disabled && 'group-hover:text-primary'}`} />
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              Drop your audio files here
            </h3>
            <p className="text-muted-foreground">
              or click to browse (WAV, MP3, OGG, FLAC, M4A supported)
            </p>
          </>
        )}
      </label>
    </div>
  );
};
