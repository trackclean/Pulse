# Test Results — 2026-02-27

Environment:
- OS: Windows (local)
- App: Clean Track Buddy / Pulse
- Date: February 27, 2026
- Installer: MSI (Pulse_1.0.5_x64_en-US.msi)

Assets:
- Generated test assets: `e2e/test-audio`
- Non-WAV samples: `e2e/test-audio/sample1_mp3.mp3`, `e2e/test-audio/sample1_ogg.ogg`, `e2e/test-audio/sample1_flac.flac`, `e2e/test-audio/sample1_m4a.m4a`, `e2e/test-audio/sample1_aac.aac`, `e2e/test-audio/sample1_wma.wma`

## Test Runs

1. Web E2E (Testing Guide subset)
   - Command: `npm run test:e2e -- e2e/testing-guide.spec.ts --workers=1`
   - Result: 11 tests → 11 passed (post-fix rerun)

2. Tauri Import (non-WAV formats)
   - Command: `npm run test:tauri -- e2e/tauri-import.spec.ts`
   - Result: 1 test → 1 passed (post-fix rerun)

3. Tauri Suite (baseline)
   - Command: `npm run test:tauri`
   - Result: 15 tests → 15 passed (post-fix rerun)

4. Web E2E (full)
   - Command: `npm run test:e2e`
   - Result: 150 tests → 150 passed

5. Full Web Suite (lint + E2E)
   - Command: `npm run test:all`
   - Result: Lint passed; 150 tests → 150 passed

## Bugs and Issues Found

### 1) Non-audio files are accepted as imports (Web)
Steps:
1. Import `e2e/test-audio/not_audio.txt`
2. Import `e2e/test-audio/not_audio.jpg`

Expected:
- Non-audio files rejected or ignored
- No “files loaded” count
- Export disabled

Actual:
- “2 files loaded”
- Cards show “Loading not_audio…”
- Export enabled

Evidence:
- `test-results/testing-guide-Testing-Guid-0c88c-ts-non-audio-files-txt-jpg--chromium/error-context.md`
- `test-results/testing-guide-Testing-Guid-0c88c-ts-non-audio-files-txt-jpg--chromium/test-failed-1.png`
Status: Fixed (verified by rerun of `npm run test:e2e -- e2e/testing-guide.spec.ts --workers=1`)

### 2) WMA file never finishes processing (Web)
Steps:
1. Import `e2e/test-audio/sample1_wma.wma` (with other non-WAV formats)

Expected:
- “Loading sample1_wma…” resolves and waveform renders

Actual:
- Card remains in “Loading sample1_wma…” state

Evidence:
- `test-results/testing-guide-Testing-Guid-c02bc-s-supported-non-WAV-formats-chromium/error-context.md`
- `test-results/testing-guide-Testing-Guid-c02bc-s-supported-non-WAV-formats-chromium/test-failed-1.png`
Status: Fixed (verified by rerun of `npm run test:e2e -- e2e/testing-guide.spec.ts --workers=1`)

### 3) WMA file never finishes processing (Tauri)
Steps:
1. Import `e2e/test-audio/sample1_wma.wma` (with other non-WAV formats)

Expected:
- “Loading sample1_wma…” resolves and waveform renders

Actual:
- Card remains in “Loading sample1_wma…” state; test times out at 60s

Evidence:
- `test-results/tauri-import-Tauri-import-non-WAV-formats-finish-processing/error-context.md`
- `test-results/tauri-import-Tauri-import-non-WAV-formats-finish-processing/test-failed-1.png`
Status: Fixed (verified by rerun of `npm run test:tauri -- e2e/tauri-import.spec.ts`)

### 4) Tauri app title test expects outdated text (Test mismatch)
Steps:
1. Run `npm run test:tauri`
2. Test `app title renders` expects `/audio sample cleaner/i`

Expected:
- Text “audio sample cleaner” visible

Actual:
- UI shows “Upload, analyze, clean, and organize your audio samples”
- Test fails; remaining Tauri tests are skipped due to serial mode

Evidence:
- `test-results/tauri-Tauri-App-Real-Runtime-app-title-renders/error-context.md`
- `test-results/tauri-Tauri-App-Real-Runtime-app-title-renders/test-failed-1.png`
Status: Fixed (test updated; full Tauri suite passes)

### 5) Tuner can trigger double playback (Windows, manual)
Steps:
1. Open Tuner on a track
2. Press Spacebar to play

Expected:
- Single playback source only

Actual:
- Same track plays twice (overlapping audio)

Status: Fixed (manual re-verify pass)

### 6) Long stems misclassified as samples (Windows, manual)
Steps:
1. Import long stems (e.g., `long_stem_A_150s.wav`, `long_stem_B_150s.wav`, `long_stem_C_150s.wav`)

Expected:
- Track type = Stem
- BPM detection skipped

Actual:
- Track type appears as Sample
- BPM shown/detected for long stems

Status: Fixed (manual re-verify pass)

## QA Checklist Coverage (TESTING_GUIDE.md)

Automated coverage completed:
- Web UI regression suite (150 tests) including import, search, settings, export (mocked), selection, rename, performance.
- Testing-guide edge cases with generated assets (special filenames, unicode, large/short files, 110+ batch, duplicates, silence).
- Tauri smoke + non-WAV import (real runtime, WebView2 CDP).

Manual QA execution summary:
- Status: Partially complete (automation + targeted Tauri). Manual OS-level verification still required.

Manual/OS-specific items still pending:
- Installation & first launch on macOS/Linux installers (fresh install) â€” not tested (no access).
- Native drag & drop from OS file explorer (Tauri), native file picker, clipboard paste (macOS/Linux) â€” not tested (no access).
- Real audio playback verification (sound output), seeking accuracy, playback speed, volume/mute (macOS/Linux).
- Key detection accuracy on tonal samples and failure on drums (confidence validation) â€” PASS (Windows) per user.
- BPM detection accuracy vs known BPM files (Tauri aubiotrack) â€” PASS (Windows) per user.
- Export to folder/ZIP on real filesystem (categorized/flat, Other prompts, cancel mid-export). **PASS (Windows)** â€” user verified.
- Update flow (check/download/install), version verification.
- Linux aubio missing dependency error handling.

### Manual QA Checklist Status (High-Level)

| Section | Status | Notes |
| --- | --- | --- |
| Installation & First Launch | PASS (Windows) | Windows installer + first launch verified; macOS/Linux pending |
| File Import (formats, special names) | PASS (automated) | Web + Tauri import coverage with generated assets |
| File Import (native dialogs/drag/drop/paste) | PASS (Windows) | Native file picker, drag & drop, clipboard paste verified; macOS/Linux pending |
| Audio Analysis (silence, stems) | PASS (automated) | Silence + stem classification covered |
| Audio Analysis (key/BPM accuracy) | PASS (Windows) | Key/BPM detection and BPM accuracy verified by user |
| Audio Playback (sound, seek, speed) | PASS (Windows) | Play/pause, seek, speed, delete-while-playing verified; macOS/Linux pending |
| Track Metadata (rename, category, batch) | PASS (automated) | Covered by web E2E |
| Track Metadata (tuner) | PASS (Windows) | Tuner playback and Spacebar behavior verified |
| Organization & Renaming | PASS (automated) | Covered by web E2E |
| Selection & Batch Ops | PASS (automated) | Covered by web E2E |
| Export (mocked) | PASS (automated) | Web E2E uses Tauri IPC mocks |
| Export (real filesystem) | PASS (Windows) | Categorized/flat, ZIP, cancel mid-export verified by user |
| Settings & Preferences | PASS (automated) | Web E2E |
| Undo/Redo (basic) | PASS (automated) | Web E2E |
| Search & Filter | PASS (automated) | Web E2E |
| Category Management | PASS (Windows) | Full CRUD verified by user |
| Updates | NOT RUN | Requires release server + manual confirmation |
| Edge Cases (large files, batches) | PASS (automated) | Generated assets |
| Regression Tests | PASS (automated) | Covered by web E2E + edge cases |

## Notes
- Non-WAV formats MP3/OGG/FLAC/M4A/AAC/WMA now complete processing in both web and Tauri reruns.
