# Pulse - Comprehensive Testing Guide

This guide provides a complete manual testing checklist for Pulse. For the first public release (v1.0.10), testing focuses on Windows. macOS and Linux releases are coming soon.

## Pre-Testing Setup

### Test Environment Preparation

**Windows**:
- Install latest version from release (or build from source)
- Ensure no previous version is installed
- Have test audio files ready in various formats

**macOS**:
- Install .app from DMG (or build from source)
- Grant necessary permissions when prompted (file access)
- Have test audio files ready in various formats

**Linux**:
- Install AppImage, .deb, or build from source
- Ensure `aubio-tools` installed: `sudo apt install aubio-tools` (Debian/Ubuntu)
- Have test audio files ready in various formats

### Test Audio Files

Prepare a test set with:
- **Formats**: WAV, MP3, OGG, FLAC, M4A, AAC, WMA
- **Types**: Drums, bass, synths, vocals, FX, percussion
- **Special cases**:
  - Silent file (for silence detection)
  - Duplicate file (same content, different name)
  - File with special characters in name: `Test!@#$%.wav`
  - File with Unicode name: `日本語テスト.wav`
  - Large file (100MB+)
  - Very short file (<1 second)

---

## Test Execution Matrix

### 1. Installation & First Launch

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| App installs successfully | ☐ | ☐ | ☐ | No errors during installation |
| App launches without errors | ☐ | ☐ | ☐ | Window appears within 5 seconds |
| Onboarding appears on first launch | ☐ | ☐ | ☐ | Should show welcome overlay |
| Can dismiss onboarding | ☐ | ☐ | ☐ | Click "Skip" or "Complete" |
| Onboarding doesn't reappear | ☐ | ☐ | ☐ | Close and reopen app |
| Settings persist after restart | ☐ | ☐ | ☐ | Change theme, close, reopen |
| No console errors on launch | ☐ | ☐ | ☐ | Check dev tools console |

---

### 2. File Import

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Drag & Drop** | | | | |
| Drag 1 file from Explorer/Finder | ☐ | ☐ | ☐ | Should import successfully |
| Drag multiple files (10+) | ☐ | ☐ | ☐ | All files should import |
| Drag folder (should be rejected) | ☐ | ☐ | ☐ | Only audio files accepted |
| Drop zone highlights on drag | ☐ | ☐ | ☐ | Visual feedback |
| **File Picker** | | | | |
| Click "Import" button opens picker | ☐ | ☐ | ☐ | Native file dialog appears |
| Select single file via picker | ☐ | ☐ | ☐ | File imports successfully |
| Select multiple files via picker | ☐ | ☐ | ☐ | All files import |
| Cancel picker dialog | ☐ | ☐ | ☐ | No crash, no import |
| **Clipboard** | | | | |
| Copy file in OS, paste in app | ☐ | ☐ | ☐ | Ctrl/Cmd+V imports file |
| **File Formats** | | | | |
| Import WAV files | ☐ | ☐ | ☐ | Check waveform renders |
| Import MP3 files | ☐ | ☐ | ☐ | Check waveform renders |
| Import OGG files | ☐ | ☐ | ☐ | Check waveform renders |
| Import FLAC files | ☐ | ☐ | ☐ | Check waveform renders |
| Import M4A files | ☐ | ☐ | ☐ | Check waveform renders |
| Import AAC files | ☐ | ☐ | ☐ | Check waveform renders |
| Import WMA files | ☐ | ☐ | ☐ | Check waveform renders |
| Reject non-audio files (.txt, .jpg) | ☐ | ☐ | ☐ | Should show error or ignore |
| **Import Validation** | | | | |
| Waveforms render correctly | ☐ | ☐ | ☐ | Visual peaks visible |
| Duration displays correctly | ☐ | ☐ | ☐ | Compare to file properties |
| File count updates in toolbar | ☐ | ☐ | ☐ | Shows correct total |
| Progress indicator during import | ☐ | ☐ | ☐ | For batch imports |
| **Duplicate Detection** | | | | |
| Import same file twice | ☐ | ☐ | ☐ | Should mark as duplicate |
| Duplicate indicator shows | ☐ | ☐ | ☐ | Visual indicator on card |
| Delete duplicates button appears | ☐ | ☐ | ☐ | In toolbar when duplicates exist |
| **Special Cases** | | | | |
| Import file with special chars (!@#$%) | ☐ | ☐ | ☐ | Should handle gracefully |
| Import file with Unicode name | ☐ | ☐ | ☐ | Should display correctly |
| Import very large file (100MB+) | ☐ | ☐ | ☐ | Should not crash |
| Import very short file (<1 sec) | ☐ | ☐ | ☐ | Should import normally |
| Import 100+ files at once | ☐ | ☐ | ☐ | Performance test |

---

### 3. Audio Analysis

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Track Type Classification** | | | | |
| Import short sample (< 2 min) | ☐ | ☐ | ☐ | Should be classified as "sample" |
| Import long file (2+ min) | ☐ | ☐ | ☐ | Should be classified as "stem" |
| Import 3+ stems with same duration | ☐ | ☐ | ☐ | All should be classified as "stem" (DAW export detection) |
| Stem shows "Stem" in BPM badge | ☐ | ☐ | ☐ | Dimmed badge with tooltip |
| Sample shows BPM value or "Set BPM" | ☐ | ☐ | ☐ | BPM detection runs for samples |
| **Silence Detection** | | | | |
| Click "Analyze Silence" button | ☐ | ☐ | ☐ | Analysis starts |
| Progress indicator shows during analysis | ☐ | ☐ | ☐ | Progress bar or spinner |
| Silent files marked correctly | ☐ | ☐ | ☐ | Use known silent file |
| Silence detected on drag & drop files | ☐ | ☐ | ☐ | CRITICAL: Must read from disk, not empty blob |
| Non-silent files not marked | ☐ | ☐ | ☐ | Use normal audio file |
| Can cancel silence analysis | ☐ | ☐ | ☐ | Click cancel button |
| Toast notification shows results | ☐ | ☐ | ☐ | Shows count of silent files |
| Silent file count in toolbar | ☐ | ☐ | ☐ | Updates correctly |
| **Key Detection** | | | | |
| Enable key detection in settings | ☐ | ☐ | ☐ | Toggle should work |
| Click "Detect Key" button | ☐ | ☐ | ☐ | Analysis starts |
| Key detected for tonal samples | ☐ | ☐ | ☐ | Use known key file (e.g., A minor) |
| Key detection fails gracefully for drums | ☐ | ☐ | ☐ | Should not crash |
| Confidence score displays | ☐ | ☐ | ☐ | Shows percentage or N/A |
| Detected key shown in card | ☐ | ☐ | ☐ | Key field populated |
| **BPM Detection** | | | | |
| BPM detected for samples (< 2 min) | ☐ | ☐ | ☐ | Use known BPM file (e.g., 120 BPM loop) |
| BPM skipped for stems (2+ min) | ☐ | ☐ | ☐ | Badge shows "Stem" instead of BPM |
| BPM skipped for DAW stem group | ☐ | ☐ | ☐ | 3+ files with same duration |
| Can manually set BPM on stems | ☐ | ☐ | ☐ | Click "Stem" badge, type value |
| BPM accuracy is reasonable | ☐ | ☐ | ☐ | Within ±5 BPM of expected |
| BPM shows in card | ☐ | ☐ | ☐ | BPM field populated |
| Confidence score displays | ☐ | ☐ | ☐ | Shows percentage or N/A |
| Linux: Error message if aubio missing | N/A | N/A | ☐ | Should show helpful error |
| **Batch Analysis** | | | | |
| Select multiple files | ☐ | ☐ | ☐ | Checkboxes work |
| Analyze silence on selected only | ☐ | ☐ | ☐ | Only selected files analyzed |
| Detect key on selected only | ☐ | ☐ | ☐ | Only selected files analyzed |

---

### 4. Audio Playback

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Basic Playback** | | | | |
| Click play button plays audio | ☐ | ☐ | ☐ | Sound should play |
| Click pause button pauses audio | ☐ | ☐ | ☐ | Sound stops |
| Play button toggles to pause icon | ☐ | ☐ | ☐ | Visual feedback |
| Waveform progress moves during playback | ☐ | ☐ | ☐ | Progress indicator |
| **Switching Tracks** | | | | |
| Playing track stops when another starts | ☐ | ☐ | ☐ | Only one plays at a time |
| Spacebar plays/pauses focused track | ☐ | ☐ | ☐ | Keyboard shortcut |
| Spacebar plays first track when none focused | ☐ | ☐ | ☐ | Default behavior |
| **Seeking** | | | | |
| Click waveform to seek | ☐ | ☐ | ☐ | Playback position changes |
| Drag on waveform to seek | ☐ | ☐ | ☐ | Smooth seeking |
| Seek during playback | ☐ | ☐ | ☐ | Continues playing from new position |
| Seek while paused | ☐ | ☐ | ☐ | Position updates |
| **Playback Speed** | | | | |
| Change speed to 0.5x | ☐ | ☐ | ☐ | Audio slows down |
| Change speed to 1.0x | ☐ | ☐ | ☐ | Normal speed |
| Change speed to 2.0x | ☐ | ☐ | ☐ | Audio speeds up |
| Speed persists per track | ☐ | ☐ | ☐ | Switching tracks maintains settings |
| **Volume** | | | | |
| Volume control works (if implemented) | ☐ | ☐ | ☐ | Sound level changes |
| Mute works (if implemented) | ☐ | ☐ | ☐ | Sound stops |
| **Playback Settings** | | | | |
| "Reset position on stop" setting works | ☐ | ☐ | ☐ | In settings, toggle and test |
| **Edge Cases** | | | | |
| Rapid play/pause clicks don't crash | ☐ | ☐ | ☐ | Click quickly multiple times |
| Delete file while playing stops playback | ☐ | ☐ | ☐ | Should stop cleanly |
| Playback works after undo/redo | ☐ | ☐ | ☐ | No broken references |

---

### 5. Track Metadata

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Filename Editing** | | | | |
| Double-click filename to edit | ☐ | ☐ | ☐ | Input field appears |
| Type new name and press Enter | ☐ | ☐ | ☐ | Name updates |
| Press Escape to cancel edit | ☐ | ☐ | ☐ | Name reverts |
| **Category Assignment** | | | | |
| Click category dropdown | ☐ | ☐ | ☐ | Dropdown opens |
| Select different category | ☐ | ☐ | ☐ | Category updates |
| Category shows in filename (if enabled) | ☐ | ☐ | ☐ | Check settings option |
| **Key Assignment** | | | | |
| Click key dropdown | ☐ | ☐ | ☐ | Dropdown opens |
| Select different key | ☐ | ☐ | ☐ | Key updates |
| Key shows in filename (if pattern includes it) | ☐ | ☐ | ☐ | Check naming pattern |
| **BPM Assignment** | | | | |
| Click BPM field | ☐ | ☐ | ☐ | Input becomes editable |
| Type new BPM value | ☐ | ☐ | ☐ | BPM updates |
| BPM shows in filename (if pattern includes it) | ☐ | ☐ | ☐ | Check naming pattern |
| **Chromatic Tuner** | | | | |
| Click tuner button | ☐ | ☐ | ☐ | Tuner modal opens |
| Tuner shows key visualization | ☐ | ☐ | ☐ | Color wheel or similar |
| Tuner does NOT start playback | ☐ | ☐ | ☐ | CRITICAL: Known issue |
| Close tuner modal | ☐ | ☐ | ☐ | Escape or close button |
| **Display Toggles** | | | | |
| Toggle BPM display in settings | ☐ | ☐ | ☐ | BPM field hides/shows |
| Toggle Key display in settings | ☐ | ☐ | ☐ | Key field hides/shows |
| Toggle Category display in settings | ☐ | ☐ | ☐ | Category dropdown hides/shows |
| Toggle Tuner button in settings | ☐ | ☐ | ☐ | Tuner button hides/shows |

---

### 6. Organization & Renaming

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Auto-Rename on Import** | | | | |
| Enable "Auto-rename on import" in settings | ☐ | ☐ | ☐ | Toggle should work |
| Import file with auto-rename enabled | ☐ | ☐ | ☐ | File renamed according to pattern |
| Pattern variables work: {name} | ☐ | ☐ | ☐ | Original filename |
| Pattern variables work: {category} | ☐ | ☐ | ☐ | Category name |
| Pattern variables work: {key} | ☐ | ☐ | ☐ | Musical key |
| Pattern variables work: {bpm} | ☐ | ☐ | ☐ | BPM value |
| **Manual Rename** | | | | |
| Click "Auto-Rename" button | ☐ | ☐ | ☐ | Preview dialog opens |
| Preview shows old vs new names | ☐ | ☐ | ☐ | Two columns visible |
| Confirm rename applies changes | ☐ | ☐ | ☐ | All files renamed |
| Cancel rename does nothing | ☐ | ☐ | ☐ | Names unchanged |
| **Restore Original Names** | | | | |
| Select renamed files | ☐ | ☐ | ☐ | Multiple selections |
| Click "Restore Original" button | ☐ | ☐ | ☐ | Names revert to original |
| **Organization Modes** | | | | |
| Switch to "Category" view | ☐ | ☐ | ☐ | Files grouped by category |
| Switch to "Alphabetical A-Z" | ☐ | ☐ | ☐ | Files sorted ascending |
| Switch to "Alphabetical Z-A" | ☐ | ☐ | ☐ | Files sorted descending |
| Switch to "Import Order" | ☐ | ☐ | ☐ | Files in import order (newest first) |
| Category grouping shows file counts | ☐ | ☐ | ☐ | Count badge on each category |
| **Drag to Reorder** | | | | |
| Drag file to new position | ☐ | ☐ | ☐ | File moves |
| Drop indicator shows during drag | ☐ | ☐ | ☐ | Visual feedback |
| **Naming Pattern Edge Cases** | | | | |
| No duplicate suffixes in filename | ☐ | ☐ | ☐ | Known issue: check for "_Bass_Bass" |
| Trailing tokens removed correctly | ☐ | ☐ | ☐ | Parentheses, brackets cleaned |

---

### 7. Selection & Batch Operations

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Selection** | | | | |
| Click checkbox to select file | ☐ | ☐ | ☐ | Visual selection state |
| Click checkbox again to deselect | ☐ | ☐ | ☐ | Deselection works |
| Ctrl/Cmd+A selects all files | ☐ | ☐ | ☐ | Keyboard shortcut |
| Click "Select All" button | ☐ | ☐ | ☐ | All files selected |
| Click "Deselect All" button | ☐ | ☐ | ☐ | All files deselected |
| Selection count shows in toolbar | ☐ | ☐ | ☐ | Shows "X selected" |
| **Batch Delete** | | | | |
| Select multiple files | ☐ | ☐ | ☐ | 3+ files |
| Click delete button | ☐ | ☐ | ☐ | Confirmation dialog appears |
| Confirm delete removes selected files | ☐ | ☐ | ☐ | Files removed from list |
| **Batch Categorize** | | | | |
| Select multiple files | ☐ | ☐ | ☐ | 3+ files |
| Open batch categorize dropdown | ☐ | ☐ | ☐ | Category list appears |
| Select category | ☐ | ☐ | ☐ | All selected files categorized |
| **Batch Analysis** | | | | |
| Select files, analyze silence | ☐ | ☐ | ☐ | Only selected files analyzed |
| Select files, detect key | ☐ | ☐ | ☐ | Only selected files analyzed |
| **Batch Export** | | | | |
| Select files, click export | ☐ | ☐ | ☐ | Only selected files exported |
| Export with nothing selected | ☐ | ☐ | ☐ | All non-silent files exported |

---

### 8. Export

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Export Dialog** | | | | |
| Click "Export" button | ☐ | ☐ | ☐ | Export options dialog appears |
| Choose "Export to Folder" | ☐ | ☐ | ☐ | Folder picker opens |
| Choose "Export to ZIP" | ☐ | ☐ | ☐ | Save dialog opens |
| Cancel export dialog | ☐ | ☐ | ☐ | No export happens |
| **Folder Structure Options** | | | | |
| Select "Categorized" structure | ☐ | ☐ | ☐ | Creates category folders |
| Select "Flat" structure | ☐ | ☐ | ☐ | All files in one folder |
| **Export to Folder (Categorized)** | | | | |
| Export creates category folders | ☐ | ☐ | ☐ | Drums/, Bass/, Synths/, etc. |
| Files placed in correct category folders | ☐ | ☐ | ☐ | Check each category |
| Filenames match preview | ☐ | ☐ | ☐ | CRITICAL: Verify exact match |
| Uncategorized files prompt appears | ☐ | ☐ | ☐ | "Other" category warning |
| "Other" category option works | ☐ | ☐ | ☐ | Creates "Other" folder if chosen |
| **Export to Folder (Flat)** | | | | |
| All files in single folder | ☐ | ☐ | ☐ | No subfolders created |
| Filenames match preview | ☐ | ☐ | ☐ | CRITICAL: Verify exact match |
| **Export to ZIP (Categorized)** | | | | |
| ZIP file created | ☐ | ☐ | ☐ | File exists on disk |
| ZIP contains category folders | ☐ | ☐ | ☐ | Extract and verify structure |
| Files in correct category folders | ☐ | ☐ | ☐ | Check contents |
| Filenames match preview | ☐ | ☐ | ☐ | CRITICAL: Verify exact match |
| **Export to ZIP (Flat)** | | | | |
| ZIP file created | ☐ | ☐ | ☐ | File exists on disk |
| ZIP contains no subfolders | ☐ | ☐ | ☐ | Extract and verify |
| Filenames match preview | ☐ | ☐ | ☐ | CRITICAL: Verify exact match |
| **Export Progress** | | | | |
| Progress indicator shows | ☐ | ☐ | ☐ | Progress bar or percentage |
| Can cancel mid-export | ☐ | ☐ | ☐ | Cancel button works |
| Toast notification on completion | ☐ | ☐ | ☐ | Shows success message |
| **Export Selection** | | | | |
| Export selected files only | ☐ | ☐ | ☐ | Select 3+ files, export |
| Export all non-silent (default) | ☐ | ☐ | ☐ | When nothing selected |
| Silent files excluded by default | ☐ | ☐ | ☐ | Verify silent files not exported |

---

### 9. Settings & Preferences

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Settings Dialog** | | | | |
| Click settings button | ☐ | ☐ | ☐ | Dialog opens |
| Press Escape to close | ☐ | ☐ | ☐ | Dialog closes |
| **Theme** | | | | |
| Change theme to "Midnight" | ☐ | ☐ | ☐ | Purple theme applies |
| Change theme to "Forest" | ☐ | ☐ | ☐ | Green theme applies |
| Change theme to "Sunset" | ☐ | ☐ | ☐ | Orange theme applies |
| Theme applies immediately | ☐ | ☐ | ☐ | No reload needed |
| Theme persists after restart | ☐ | ☐ | ☐ | Close and reopen app |
| **Waveform Color** | | | | |
| Custom waveform color picker | ☐ | ☐ | ☐ | Color picker opens |
| Choose custom color | ☐ | ☐ | ☐ | Waveforms change color |
| Reset waveform color | ☐ | ☐ | ☐ | Returns to theme default |
| **Naming Settings** | | | | |
| Toggle "Auto-rename on import" | ☐ | ☐ | ☐ | Setting saves |
| Change naming pattern | ☐ | ☐ | ☐ | Custom pattern accepted |
| Pattern validation works | ☐ | ☐ | ☐ | Invalid patterns rejected |
| Toggle "Category in filename" | ☐ | ☐ | ☐ | Affects renaming |
| **Export Settings** | | | | |
| Change default export format | ☐ | ☐ | ☐ | ZIP or Folder |
| Change default folder structure | ☐ | ☐ | ☐ | Categorized or Flat |
| **Playback Settings** | | | | |
| Toggle "Reset position on stop" | ☐ | ☐ | ☐ | Affects playback behavior |
| **History Settings** | | | | |
| Change "Max undo history" | ☐ | ☐ | ☐ | Set to lower value (e.g., 5) |
| Undo history respects new limit | ☐ | ☐ | ☐ | Test with multiple undos |
| **Key Detection Settings** | | | | |
| Enable key detection | ☐ | ☐ | ☐ | Key detection becomes available |
| Disable key detection | ☐ | ☐ | ☐ | Key detection disabled |
| **Reset Settings** | | | | |
| Click "Reset to Defaults" | ☐ | ☐ | ☐ | All settings reset |
| Categories reset to defaults | ☐ | ☐ | ☐ | Default categories restored |

---

### 10. Undo/Redo

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Undo Operations** | | | | |
| Delete file, press Ctrl/Cmd+Z | ☐ | ☐ | ☐ | File restored |
| Rename file, press Ctrl/Cmd+Z | ☐ | ☐ | ☐ | Name reverted |
| Change category, press Ctrl/Cmd+Z | ☐ | ☐ | ☐ | Category reverted |
| Change key, press Ctrl/Cmd+Z | ☐ | ☐ | ☐ | Key reverted |
| Change BPM, press Ctrl/Cmd+Z | ☐ | ☐ | ☐ | BPM reverted |
| **Undo Button** | | | | |
| Click undo button in toolbar | ☐ | ☐ | ☐ | Last action undone |
| Undo button disabled when no history | ☐ | ☐ | ☐ | Grayed out |
| **Undo History Limit** | | | | |
| Perform 50+ actions | ☐ | ☐ | ☐ | Exceeds default history |
| Oldest actions removed from history | ☐ | ☐ | ☐ | Can't undo beyond limit |
| **Blob URL Cleanup** | | | | |
| Import files, delete them, undo repeatedly | ☐ | ☐ | ☐ | Memory doesn't leak |
| Check memory usage (dev tools) | ☐ | ☐ | ☐ | Should stay stable |

---

### 11. Search & Filter

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Search Activation** | | | | |
| Press Ctrl/Cmd+F | ☐ | ☐ | ☐ | Search input focused |
| Click search input | ☐ | ☐ | ☐ | Input focused |
| **Search by Filename** | | | | |
| Type filename substring | ☐ | ☐ | ☐ | Matching files shown |
| Case-insensitive search | ☐ | ☐ | ☐ | "KICK" finds "kick" |
| Partial match works | ☐ | ☐ | ☐ | "hat" finds "hihat" |
| **Search by Category** | | | | |
| Type category name | ☐ | ☐ | ☐ | Files in that category shown |
| **Search by Key** | | | | |
| Type musical key (e.g., "Am") | ☐ | ☐ | ☐ | Files with that key shown |
| **Clear Search** | | | | |
| Clear search input | ☐ | ☐ | ☐ | All files shown again |
| Press Escape in search | ☐ | ☐ | ☐ | Search clears and unfocuses |
| **Search Edge Cases** | | | | |
| Search with special characters | ☐ | ☐ | ☐ | Should not crash |
| Search with Unicode characters | ☐ | ☐ | ☐ | Should work correctly |
| Search with no results | ☐ | ☐ | ☐ | Shows "No files found" message |

---

### 12. Category Management

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Category Manager** | | | | |
| Click "Manage Categories" button | ☐ | ☐ | ☐ | Category manager opens |
| Default categories listed | ☐ | ☐ | ☐ | Drums, Bass, Synths, etc. |
| **Create Category** | | | | |
| Click "Add Category" | ☐ | ☐ | ☐ | New category form appears |
| Enter name and keywords | ☐ | ☐ | ☐ | Form validates input |
| Save new category | ☐ | ☐ | ☐ | Category added to list |
| New category appears in dropdowns | ☐ | ☐ | ☐ | Available for assignment |
| **Edit Category** | | | | |
| Click edit on category | ☐ | ☐ | ☐ | Edit form appears |
| Change category name | ☐ | ☐ | ☐ | Name updates |
| Change keywords | ☐ | ☐ | ☐ | Keywords update |
| Save changes | ☐ | ☐ | ☐ | Category updated |
| **Delete Category** | | | | |
| Click delete on category | ☐ | ☐ | ☐ | Confirmation dialog appears |
| Files reassignment prompt | ☐ | ☐ | ☐ | Choose new category for files |
| Confirm delete | ☐ | ☐ | ☐ | Category removed |
| **Archive/Restore** | | | | |
| Archive category | ☐ | ☐ | ☐ | Category hidden from dropdowns |
| Restore archived category | ☐ | ☐ | ☐ | Category reappears |

---

### 13. Updates

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Update Check** | | | | |
| Update check on launch | ☐ | ☐ | ☐ | Checks GitHub for updates |
| No update available message | ☐ | ☐ | ☐ | Shows "Up to date" |
| Update available notification | ☐ | ☐ | ☐ | Requires new release |
| **Update Download** | | | | |
| Click "Download Update" | ☐ | ☐ | ☐ | Download starts |
| Progress indicator shows | ☐ | ☐ | ☐ | Download percentage |
| Download completes | ☐ | ☐ | ☐ | Install prompt appears |
| **Update Install** | | | | |
| Click "Install Update" | ☐ | ☐ | ☐ | App restarts |
| Updated version launches | ☐ | ☐ | ☐ | Version number changed |
| Settings preserved after update | ☐ | ☐ | ☐ | Theme, settings intact |

---

### 14. Edge Cases & Error Handling

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Large Batches** | | | | |
| Import 100+ files at once | ☐ | ☐ | ☐ | Should not crash |
| Scroll performance with 100+ files | ☐ | ☐ | ☐ | Smooth scrolling |
| Search with 100+ files | ☐ | ☐ | ☐ | Results instant |
| Export 100+ files | ☐ | ☐ | ☐ | Completes successfully |
| **Large Files** | | | | |
| Import 500MB+ file | ☐ | ☐ | ☐ | Should handle gracefully |
| Waveform renders for large file | ☐ | ☐ | ☐ | May take time but shouldn't crash |
| Playback works for large file | ☐ | ☐ | ☐ | Audio plays correctly |
| **Special Characters** | | | | |
| File with !@#$%^&*() in name | ☐ | ☐ | ☐ | Imports and displays correctly |
| File with Unicode name | ☐ | ☐ | ☐ | Imports and displays correctly |
| Export with special char names | ☐ | ☐ | ☐ | Files export with valid names |
| **Disk Space** | | | | |
| Export with insufficient disk space | ☐ | ☐ | ☐ | Should fail gracefully with error |
| **Missing Dependencies** | | | | |
| Linux: aubio-tools not installed | N/A | N/A | ☐ | Helpful error message shown |
| **Rapid Actions** | | | | |
| Rapid play/pause clicks | ☐ | ☐ | ☐ | Should not crash |
| Rapid import clicks | ☐ | ☐ | ☐ | Should queue properly |
| Spam keyboard shortcuts | ☐ | ☐ | ☐ | Should not crash |

---

### 15. Regression Tests

| Test Case | Windows | macOS | Linux | Notes |
|-----------|---------|-------|-------|-------|
| **Known Issues (Should Be Fixed)** | | | | |
| No duplicate suffixes in filenames | ☐ | ☐ | ☐ | Check for "_Bass_Bass" pattern |
| Tuner doesn't start second playback | ☐ | ☐ | ☐ | CRITICAL: Open tuner, verify no double audio |
| No crashes on large batches | ☐ | ☐ | ☐ | 100+ files |
| Blob URLs cleaned up properly | ☐ | ☐ | ☐ | Check memory usage |
| **Previous Bugs** | | | | |
| Silence detection works on drag & drop files | ☐ | ☐ | ☐ | Was reading empty blob instead of disk file |
| BPM not attempted on stems (2+ min files) | ☐ | ☐ | ☐ | Stems show "Stem" badge, not stuck loading |
| DAW stems detected by same duration | ☐ | ☐ | ☐ | Import 3+ stems from same project |

---

## Test Completion

### Sign-off

| Platform | Tester Name | Date | Pass/Fail | Notes |
|----------|-------------|------|-----------|-------|
| Windows | | | | |
| macOS | | | | |
| Linux | | | | |

### Critical Issues Found

List any critical issues that block release:

1.
2.
3.

### Minor Issues Found

List any non-blocking issues for future fixes:

1.
2.
3.

---

## Tips for Effective Testing

1. **Test in Isolation**: Test one feature at a time to isolate issues
2. **Document Everything**: Screenshot bugs, note exact steps to reproduce
3. **Test Extremes**: Try large files, many files, special characters, edge cases
4. **Fresh Install**: Always test with a clean installation, not a development build
5. **Multiple Runs**: Some bugs only appear on second or third run
6. **Real-World Usage**: Import your actual sample library, use real workflows
7. **Performance**: Watch for slowdowns, memory leaks, unresponsive UI

---

## Resources

- **Bug Report Template**: [docs/BUG_REPORT_TEMPLATE.md](BUG_REPORT_TEMPLATE.md)
- **Platform-Specific Notes**: [docs/PLATFORM_TESTING.md](PLATFORM_TESTING.md)
- **Automated Tests**: Run `npm run test:e2e` for Playwright tests
