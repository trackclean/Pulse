# QA & User Testing Report

**Date:** 2026-02-16
**Version:** 1.0.5
**Scope:** Full code review, static analysis, user-flow testing simulation

---

## 1. Build & Tooling Status

| Check | Status | Notes |
|-------|--------|-------|
| `npm run lint` | PASS | Zero lint errors |
| `npm run build` | PASS | All 1769 modules transformed, 9 chunks produced |
| TypeScript compilation | PASS | No type errors |
| npm audit | 6 vulnerabilities | See §2 below |

---

## 2. Security Vulnerabilities (npm audit)

### HIGH (3)

| Package | Issue | Fix |
|---------|-------|-----|
| `@remix-run/router` (<=1.23.1) | XSS via Open Redirects ([GHSA-2w69-qvjg-hvjx](https://github.com/advisories/GHSA-2w69-qvjg-hvjx)) | `npm audit fix` — upgrades react-router |
| `react-router` (6.0.0 - 6.30.2) | Depends on vulnerable `@remix-run/router` | Same fix as above |
| `react-router-dom` (6.0.0-alpha.0 - 6.30.2) | Depends on vulnerable `@remix-run/router` | Same fix as above |

### MODERATE (3)

| Package | Issue | Fix |
|---------|-------|-----|
| `esbuild` (<=0.24.2) | Dev server allows cross-origin requests to read responses | Requires `npm audit fix --force` (breaking: vite 7.x) |
| `lodash` (4.0.0 - 4.17.21) | Prototype Pollution in `_.unset` and `_.omit` | `npm audit fix` |
| `vite` (0.11.0 - 6.1.6) | Depends on vulnerable esbuild | Same as esbuild fix |

**Recommendation:** Run `npm audit fix` to address the non-breaking fixes (react-router, lodash). The esbuild/vite fix is dev-only and can wait until the next Vite major upgrade.

---

## 3. Bugs Found

### BUG-01: Drag index is wrong in "category" grouped view (Severity: HIGH)

**File:** `src/pages/Index.tsx:1449`

When rendering in the category-organized view, the `onDragStart` and `onDragOver` handlers receive the *local* `index` within the category group, but the `handleDragOver` function operates on the *global* `audioFiles` array indices. This causes files to be dragged to wrong positions or to the wrong files entirely.

```tsx
// In the category view:
{groupedFiles[category].map((audioFile, index) => (
  <div
    onDragStart={() => handleDragStart(index)}        // ← local index, not global
    onDragOver={(e) => handleDragOver(e, index)}       // ← local index, not global
```

**Expected:** The global index from `audioFiles` should be used (like the non-organized view does with `audioFiles.findIndex`).

**Impact:** Drag-to-reorder in grouped-by-category view silently shuffles wrong files.

---

### BUG-02: `handleFilesAdded` auto-rename on import bypasses `sanitizePatternOutput` (Severity: MEDIUM)

**File:** `src/pages/Index.tsx:400-406`

When `autoRenameOnImport` is enabled and `namingPattern` is set, the initial rename (before processing) does a raw `.replace()` without calling `sanitizePatternOutput`, so empty tokens (e.g., `{key}` before key detection) leave behind empty brackets `[]` or double spaces in the filename.

```tsx
name = settings.namingPattern
  .replace('{name}', baseName)
  .replace('{category}', category || 'Other')
  .replace('{key}', '')           // ← leaves "[]" or "()" in pattern
  .replace('{bpm}', '') + ext;    // ← no sanitization
```

The post-processing rename at line 478 does call `buildNameFromPattern` which sanitizes, but for users who inspect file names immediately after import (before analysis completes), they see broken names briefly.

---

### BUG-03: Blob URL memory leak on large sessions (Severity: MEDIUM)

**File:** `src/pages/Index.tsx:390`

`URL.createObjectURL(file)` is called for each imported file but the corresponding `URL.revokeObjectURL()` is never called. Comments in the code say "Don't revoke blob URL - it might be needed for undo", but the undo stack is bounded by `maxUndoHistory`. Once old states are evicted from the undo stack, the blob URLs they reference are never freed.

**Impact:** For users importing hundreds of files in a session, memory grows unbounded. Each blob URL holds the full audio file data in memory.

**Recommendation:** Implement a reference-counting or cleanup mechanism when files leave both the active list and all undo stack entries.

---

### BUG-04: `handleDeleteSilent` toast fires inside setState (Severity: LOW)

**File:** `src/pages/Index.tsx:952`

The `toast.success()` call is inside the `setAudioFiles` updater function. React state updaters should be pure functions. While this works in practice, it fires during the render phase and could cause issues in React strict mode or future concurrent rendering.

```tsx
setAudioFiles((prev) => {
  // ...
  toast.success(`Deleted ${silentFiles.length} silent track${...}`); // ← side effect in updater
  return renumbered;
});
```

Same issue in `handleDeleteDuplicates` (line 970).

---

### BUG-05: Missing error handling in `detectKeyForFile` for non-Tauri environment (Severity: LOW)

**File:** `src/utils/audioAnalysis.ts:474-485`

When running in a non-Tauri environment (e.g., web preview mode), if `file.path` is undefined, `detectKeyForFile` returns `{}` immediately without falling back to the JavaScript-based key detection (`detectKeyFromChannel`). The JS-based detection code exists but is dead code — it's never called from any code path.

```tsx
export const detectKeyForFile = async (file: File, filePath?: string) => {
  const path = getFilePath(file, filePath);
  if (path) {
    // Only runs for Tauri files with paths
    try { return await invoke('detect_key', { path }); } catch { return {}; }
  }
  return {};  // ← Non-Tauri files get no key detection at all
};
```

**Impact:** Key detection is completely non-functional outside the Tauri runtime. The `detectKeyFromChannel` function (lines 134-259) is dead code.

---

### BUG-06: `RENAME_RULES` keyword conflicts cause unexpected categorization (Severity: LOW)

**File:** `src/types/audio.ts:36,66-67`

Several keywords appear in multiple rules:
- `'clap'` is in both "Snare" (line 34) and "Clap" (line 36) rules — but "Snare" wins because it comes first.
- `'noise'` is in both "NoiseFX" (line 56) and "Artifact" (line 67) rules.
- `'fx'` is in both "FX" (line 55) and "FX" again (line 73).
- `'transition'` is in both "FX" (line 55) and "Transition" (line 66).
- `'drums'` is in both "DrumLoop" (line 38) and "DrumStem" (line 70).

The first match wins, which means "Clap" rule and "Transition" rule are effectively unreachable for their shared keywords.

---

### BUG-07: Category hardcoded sort order is out of sync (Severity: LOW)

**File:** `src/pages/Index.tsx:1298`

```tsx
const categoryOrder = ['drums', 'synths', 'basses', 'fx', 'vox', 'instruments', 'reese/bass', 'background'];
```

- `'basses'` doesn't match any default category (the actual category is `'Bass'`). The comparison on line 1305 is case-sensitive against `groupedFiles` keys, which use the raw `file.category` value (capitalized like `'Bass'`). So this entry never matches.
- `'reese/bass'` doesn't match any default category either.

**Impact:** Category sort order in the grouped view doesn't work as intended for Bass and Reese categories.

---

## 4. UX Issues & Usability Concerns

### UX-01: No confirmation dialog for destructive bulk operations

The "Delete Selected" button immediately deletes files without confirmation. While undo exists, users who accidentally click this with 100+ files selected have no warning. Compare: "Delete Silent" and "Delete Duplicates" also have no confirmation.

**Recommendation:** Add an `AlertDialog` confirmation for bulk deletes when >5 files are affected.

---

### UX-02: Onboarding blocks file upload zone

**File:** `src/pages/Index.tsx:1421-1424`

The `FileUploadZone` is rendered with `disabled={!settings.hasCompletedOnboarding}`, which means drag-and-drop is blocked until onboarding completes. However, the onboarding overlay is a fixed overlay that covers the entire screen anyway, so the `disabled` prop is redundant. More importantly, if a user dismisses onboarding by pressing Escape (not handled), they could be stuck with a disabled upload zone.

---

### UX-03: "Restore Original" requires file selection but doesn't indicate this

**File:** `src/pages/Index.tsx:1166-1206`

The `handleReverseRename` function shows "No files selected" error if nothing is selected, but the "Restore Original" button is only visible when files are selected (in the batch selection toolbar at line 318). This is consistent, but the error case can still be triggered if the user deselects files after the toolbar renders and before clicking.

---

### UX-04: Search doesn't highlight matches

The search filter hides non-matching files but doesn't highlight the matching text in visible results. For large libraries, it can be unclear why certain files are shown.

---

### UX-05: Loading screen displays misleading "Step 1/2" and "Step 2/2"

**File:** `src/components/LoadingScreen.tsx:19,29`

The loading screen shows "Step 1/2: File scanning" and "Step 2/2: Waveform generation" based on a single progress value threshold of 50%. But the actual processing is a single pass (processAudioFile handles everything). The waveform generation isn't a separate step — it happens within the same processing loop.

---

### UX-06: No keyboard shortcut for Delete

While Space (play/pause), Ctrl+A (select all), Ctrl+Z (undo), and Ctrl+F (search) are implemented, there's no Delete/Backspace shortcut to delete selected files. This is a common expectation for file management UIs.

---

### UX-07: BPM input accepts any number including 0 and negative

**File:** `src/components/AudioFileCard.tsx:167-168`

The BPM validation rejects non-finite and <= 0 values, which is correct. However, the HTML `<Input type="number" min="1">` allows typing 0 and negative values before blur validation. The `step="1"` attribute also doesn't prevent decimal input. A visual cue or instant validation would improve UX.

---

## 5. Performance Concerns

### PERF-01: Undo stack stores full copies of all files

**File:** `src/pages/Index.tsx:225-233`

Every undoable action pushes a full shallow copy of the `audioFiles` array (including all `File` objects and blob URLs). With 500 files and `maxUndoHistory` at 50, that's 25,000 array entries plus retained references to blob URLs and File objects.

**Recommendation:** Consider storing diffs/patches instead of full snapshots, or implement a more memory-efficient undo mechanism.

---

### PERF-02: `filteredFiles` recomputes on every audioFiles change

The `useMemo` for `filteredFiles` depends on `audioFiles` which changes on every play/pause toggle, waveform ready event, etc. This means the filter runs frequently even when the file list hasn't structurally changed.

---

### PERF-03: WaveformQueue concurrency of 12 may be too aggressive

**File:** `src/utils/waveformQueue.ts:12`

A concurrency of 12 for WaveSurfer loading could overwhelm the browser's audio context and network stack, especially with Tauri `convertFileSrc` URLs that go through the IPC bridge.

---

## 6. Code Quality Observations

### CQ-01: Index.tsx is 1584 lines — consider decomposition

The main page contains all business logic, state management, and rendering. Extracting custom hooks (e.g., `useAudioFileManager`, `useFileImport`, `useExportManager`) would improve maintainability and testability.

### CQ-02: Dead code — JavaScript-based key and BPM detection

`detectKeyFromChannel` and `detectBpmFromChannel` in `audioAnalysis.ts` are complete implementations (~270 lines total) that are never called. They were presumably superseded by the Rust/Tauri backend but left in place.

### CQ-03: Duplicate `pathToFile` implementation

The `pathToFile` function and supporting helpers (`getFileExtension`, `getFileName`, `SUPPORTED_AUDIO_EXTENSIONS`, `AUDIO_MIME_TYPES`) are duplicated identically in both `FileUploadZone.tsx` and `useTauriDragDrop.ts`. These should be extracted to a shared utility.

### CQ-04: No automated tests

The project has no unit or integration tests. For a codebase of this complexity (audio processing, file management, state transitions), automated tests would prevent regressions on the rename logic, category assignment, pattern building, and duplicate detection.

### CQ-05: `confirm()` usage for reset

**File:** `src/components/SettingsDialog.tsx:129`

The native `confirm()` dialog is used for "Reset to defaults" which looks jarring in a polished Tauri app. An `AlertDialog` component (which already exists in the project) would be more appropriate.

---

## 7. Edge Cases to Test

| Scenario | Risk | Area |
|----------|------|------|
| Import 500+ files simultaneously | Memory / performance | Index.tsx:handleFilesAdded |
| File with no extension | Rename logic may produce `undefined` | renameUtils.ts |
| File with multiple dots (e.g., `my.file.name.wav`) | Extension extraction | Multiple files |
| Unicode filenames (Chinese, Arabic, emoji) | Regex patterns may not handle Unicode | renameUtils.ts, categoryConfig.ts |
| Zero-length audio file | Division by zero in RMS | audioAnalysis.ts |
| Audio file with 0 sample rate | Key/BPM detection failure | key_detection.rs (handled), audioAnalysis.ts |
| Naming pattern with no tokens (e.g., `"MyFile"`) | All files get same name | buildNameFromPattern |
| Export when URL blob has been revoked | Fetch failure during export | exportUtils.ts |
| Category name containing regex chars (e.g., `"FX (Special)"`) | Regex in `getBaseName` may break | AudioFileCard.tsx:92 |
| Rename to name that already exists | No uniqueness check in manual rename | Index.tsx:handleRename |
| Undo after category deletion | Undo restores files with deleted category | Index.tsx:handleUndo |
| Close settings without saving after theme preview | Theme should revert (handled correctly) | SettingsDialog.tsx |
| Import same file twice | Duplicate detection works only by hash | Index.tsx:handleFilesAdded |
| aubiotrack binary missing | BPM detection fails gracefully | bpm_detection.rs (handled) |

---

## 8. Accessibility Gaps

- **No ARIA labels** on the waveform div — screen readers can't identify it
- **Checkboxes** in AudioFileCard use native `<input type="checkbox">` without labels
- **Color-only indicators** for silent (red border) and duplicate (yellow badge) — no text-only alternative for colorblind users (partially mitigated by badge text)
- **Keyboard navigation** doesn't work for drag-to-reorder
- **Focus management** doesn't trap within modals (relies on Radix which handles this, but ChromaticTunerModal uses low-level DialogPrimitive)

---

## 9. Recommendations Summary (Priority Order)

1. **Fix BUG-01** (drag index in grouped view) — this silently corrupts file order
2. **Fix BUG-07** (category sort order) — bass category never sorts correctly
3. **Run `npm audit fix`** to address react-router XSS and lodash prototype pollution
4. **Fix BUG-02** (auto-rename sanitization) — visible to users on every import
5. **Address BUG-03** (blob URL leak) — affects long-running sessions
6. **Add confirmation for bulk deletes** (UX-01)
7. **Extract dead code** or wire up JS fallback for key detection (BUG-05/CQ-02)
8. **Consolidate duplicated `pathToFile` code** (CQ-03)
9. **Add automated tests** for rename logic and category assignment (CQ-04)
10. **Move side effects out of setState updaters** (BUG-04)
