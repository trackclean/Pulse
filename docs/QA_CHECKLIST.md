# QA Checklist

Use this checklist before releases or major feature changes.

## Automated
- `npm run lint`
- `npm run build`
- `cargo test` (from `src-tauri`)

## Manual QA (All OS)

### Install & Launch
- Install app and launch successfully.
- Onboarding appears on first launch.
- Relaunch preserves settings.

### Import & Analyze
- Import WAV/MP3/OGG/FLAC/M4A/AAC/WMA (drag & drop + file picker).
- Paste import from clipboard.
- Waveforms render and durations are correct.
- Silence detection works and labels silent files.
- Duplicate detection flags duplicates on import.
- Key detection works when enabled.
- BPM detection works and is editable.

### Playback & UI
- Play/pause single track.
- Switching tracks stops previous playback.
- Seek waveform to new position.
- Track selection (single + multi) works.
- Keyboard shortcuts: Space, Ctrl/Cmd+F, Ctrl/Cmd+A, Ctrl/Cmd+Z.

### Track Metadata
- Change category per track.
- Change key per track.
- Change BPM per track.
- Toggle display of BPM/Key/Category/Tuner in Settings.
- Tuner opens and does not double-play audio.

### Rename & Organize
- Auto-rename on import.
- Manual rename (double-click) works.
- Naming patterns with `{name}`, `{category}`, `{key}`, `{bpm}` produce expected output.
- Restore original filenames works.
- Undo stack works and respects max history.

### Export
- Export selected tracks only.
- Export all non-silent tracks when nothing selected.
- Export to folder and zip.
- Categorized vs flat folder structure.
- “Other” category prompt behavior.
- Cancel export mid-way.

### Settings
- Theme changes apply immediately and persist.
- Waveform color customization and reset.
- Reset to default settings and categories.

## OS-Specific
- Windows: drag/drop from Explorer, playback, export.
- macOS: drag/drop from Finder, playback, export.
- Linux: drag/drop from file manager, playback, export.

## Regression Targets
- BPM/Key/category naming does not duplicate suffixes.
- Tuner does not start a second playback stream.
- No crashes when importing large batches.
