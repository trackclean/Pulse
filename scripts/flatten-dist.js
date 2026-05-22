#!/usr/bin/env node
/**
 * Post-build script to flatten dist structure for app builds
 * Moves dist/src/index.html to dist/index.html (where Tauri expects it)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, '..', 'dist', 'src', 'index.html');
const destPath = path.join(__dirname, '..', 'dist', 'index.html');

if (fs.existsSync(srcPath)) {
  console.log('📦 Flattening dist structure...');
  fs.copyFileSync(srcPath, destPath);
  console.log(`✅ Moved dist/src/index.html → dist/index.html`);
  
  // Clean up src folder
  try {
    fs.rmSync(path.join(__dirname, '..', 'dist', 'src'), { recursive: true, force: true });
    console.log('🧹 Removed dist/src directory');
  } catch (e) {
    console.warn('⚠️ Could not remove dist/src:', e.message);
  }
} else {
  console.log('ℹ️ dist/src/index.html not found (website build?)');
}
