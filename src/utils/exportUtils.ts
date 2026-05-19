import { open } from '@tauri-apps/plugin-dialog';
import { mkdir, writeFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { AudioFile } from '@/types/audio';
import { AppSettings } from './categoryConfig';
import JSZip from 'jszip';

/**
 * Strip redundant category suffix from filename when it matches the target folder.
 * e.g. "Bass (Bass).mp3" in a "Bass" folder → "Bass.mp3"
 */
const stripCategorySuffix = (fileName: string, category: string): string => {
  const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const extMatch = fileName.match(/\.[^/.]+$/);
  const ext = extMatch?.[0] ?? '';
  const base = extMatch ? fileName.slice(0, extMatch.index) : fileName;

  let cleaned = base;
  // Remove "(Category)" tokens anywhere in the name
  cleaned = cleaned.replace(new RegExp(`\\s*\\(${escaped}\\)`, 'gi'), '');
  // Remove "Category - " prefix
  cleaned = cleaned.replace(new RegExp(`^${escaped}\\s*-\\s*`, 'i'), '');
  // Remove " - Category" suffix
  cleaned = cleaned.replace(new RegExp(`\\s*-\\s*${escaped}$`, 'i'), '');

  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return `${cleaned}${ext}`;
};

export const exportFilesAsZip = async (
  filesToExport: AudioFile[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
  settings?: AppSettings
): Promise<{ success: boolean; cancelled?: boolean }> => {
  try {
    if (filesToExport.length === 0) return { success: false };

    // Default settings if not provided
    const exportFormat = settings?.exportFormat || 'folder';
    const folderStructure = settings?.folderStructure || 'categorized';

    let result: boolean;
    if (exportFormat === 'zip') {
      result = await exportAsZipArchive(filesToExport, onProgress, signal, folderStructure);
    } else {
      result = await exportAsFolder(filesToExport, onProgress, signal, folderStructure);
    }

    if (!result) {
      return { success: false, cancelled: true };
    }

    return { success: true };
  } catch (err) {
    if ((err as Error).message === 'Export cancelled') {
      throw err;
    }
    console.error('Error exporting files:', err);
    throw err;
  }
};

const exportAsFolder = async (
  filesToExport: AudioFile[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
  folderStructure: 'flat' | 'categorized' = 'categorized'
): Promise<boolean> => {
  const rootDir = await open({
    directory: true,
    multiple: false,
    recursive: true,
  });

  if (!rootDir || typeof rootDir !== 'string') {
    console.log('User cancelled folder selection.');
    return false;
  }

  // Create category folders if needed
  if (folderStructure === 'categorized') {
    const categoriesInFiles = new Set(filesToExport.map(f => f.category || 'Other'));
    for (const cat of categoriesInFiles) {
      const catPath = await join(rootDir, cat);
      await mkdir(catPath, { recursive: true });
    }
  }

  for (let i = 0; i < filesToExport.length; i++) {
    if (signal?.aborted) {
      throw new Error('Export cancelled');
    }

    const file = filesToExport[i];
    const category = file.category || 'Other';

    const exportName = folderStructure === 'categorized'
      ? stripCategorySuffix(file.name, category)
      : file.name;

    let filePath;
    if (folderStructure === 'categorized') {
      filePath = await join(rootDir, category, exportName);
    } else {
      filePath = await join(rootDir, exportName);
    }

    // Fetch file content
    const response = await fetch(file.url);
    const blob = await response.blob();
    const buffer = new Uint8Array(await blob.arrayBuffer());

    await writeFile(filePath, buffer);

    if (onProgress) {
      onProgress(i + 1, filesToExport.length);
    }
  }
  return true;
};

const exportAsZipArchive = async (
  filesToExport: AudioFile[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
  folderStructure: 'flat' | 'categorized' = 'categorized'
): Promise<boolean> => {
  const zip = new JSZip();

  for (let i = 0; i < filesToExport.length; i++) {
    if (signal?.aborted) {
      throw new Error('Export cancelled');
    }

    const file = filesToExport[i];
    const category = file.category || 'Other';

    // Fetch file content
    const response = await fetch(file.url);
    const blob = await response.blob();

    if (folderStructure === 'categorized') {
      zip.folder(category)?.file(stripCategorySuffix(file.name, category), blob);
    } else {
      zip.file(file.name, blob);
    }

    if (onProgress) {
      // Progress for preparation (50% of total)
      onProgress((i + 1) / 2, filesToExport.length);
    }
  }

  if (signal?.aborted) throw new Error('Export cancelled');

  // Generate zip
  const content = await zip.generateAsync({ type: 'uint8array' }, (metadata) => {
    if (onProgress) {
      // Progress for generation (remaining 50%), clamped to prevent exceeding total
      const progress = Math.min(
        filesToExport.length / 2 + (metadata.percent / 100) * (filesToExport.length / 2),
        filesToExport.length
      );
      onProgress(progress, filesToExport.length);
    }
  });

  if (signal?.aborted) throw new Error('Export cancelled');

  // Save zip file
  const savePath = await open({
    directory: true,
    multiple: false,
    recursive: true,
    title: 'Select folder to save ZIP'
  });

  if (!savePath || typeof savePath !== 'string') {
    return false;
  }

  const zipPath = await join(savePath, `Pulse_Export_${Date.now()}.zip`);
  await writeFile(zipPath, content);
  return true;
};
