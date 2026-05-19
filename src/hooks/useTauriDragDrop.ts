import { useEffect } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

// Audio file extensions supported by the application
const SUPPORTED_AUDIO_EXTENSIONS = ['.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac', '.wma'];

// MIME types mapping for audio files
const AUDIO_MIME_TYPES: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wma': 'audio/x-ms-wma',
};

/**
 * Get the file extension from a path (lowercased)
 */
function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '';
  return path.slice(lastDot).toLowerCase();
}

/**
 * Get the filename from a path
 */
function getFileName(path: string): string {
  // Handle both Windows and Unix path separators
  const lastSep = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return lastSep === -1 ? path : path.slice(lastSep + 1);
}

/**
 * Filter paths to only include supported audio files
 */
function filterAudioPaths(paths: string[]): string[] {
  return paths.filter(path => {
    const ext = getFileExtension(path);
    return SUPPORTED_AUDIO_EXTENSIONS.includes(ext);
  });
}

/**
 * Convert a file path to a lightweight File object without reading the entire file.
 * This creates a minimal File object with just the path metadata.
 * The actual file content will be loaded lazily when needed.
 */
function pathToFile(path: string): File {
  const ext = getFileExtension(path);
  const mimeType = AUDIO_MIME_TYPES[ext] || 'application/octet-stream';
  const fileName = getFileName(path);
  
  // Create a minimal empty blob - we'll use the path to load the actual file
  const blob = new Blob([], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });
  
  // Attach the path to the file object for use in other components
  Object.defineProperty(file, 'path', {
    value: path,
    writable: false,
    enumerable: true, // Make it visible
    configurable: false
  });
  
  return file;
}

/**
 * Custom hook to handle Tauri native drag and drop events.
 * This is necessary because Tauri intercepts drag and drop events by default,
 * preventing HTML5 drag and drop from working when files are dragged from
 * the OS file explorer.
 */
export function useTauriDragDrop(onFilesAdded: (files: File[]) => void): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const webview = getCurrentWebview();
        
        unlisten = await webview.onDragDropEvent(async (event) => {
          if (event.payload.type === 'drop' && event.payload.paths.length > 0) {
            // Filter for audio files only
            const audioPaths = filterAudioPaths(event.payload.paths);
            
            if (audioPaths.length === 0) {
              return;
            }
            
            // Convert paths to File objects (without reading content for performance)
            const files = audioPaths.map(pathToFile);
            
            if (files.length > 0) {
              onFilesAdded(files);
            }
          }
        });
      } catch (error) {
        // If not running in Tauri (e.g., development in browser), silently ignore
        console.debug('Tauri drag and drop not available:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [onFilesAdded]);
}
