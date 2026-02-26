Pulse

The app is a local-first audio sample cleaner and organizer that ingests audio files, analyzes them locally, and exports curated sample packs without modifying the original files. It is designed for stem organizing when starting a new session (mixing and mastering), as well as for organizing samples and sample packs.

## Core Workflow
1. Configure naming, export, and category rules in Settings and Categories.
2. Import audio via drag and drop, file picker, or clipboard paste.
3. Let the app analyze files for waveform, duplicates, key, and BPM.
4. Optionally run silence analysis and auto-rename with preview.
5. Review, edit, and organize files.
6. Export selected files or all non-silent files to a folder or ZIP.

## Importing Audio
- Drag and drop: Supports both browser drag and drop and native Tauri drag and drop from the OS file explorer.
- File picker: Uses the Tauri file dialog when available, with a browser file input fallback.
- Clipboard paste: Pasting audio file items from the OS file explorer imports them when focus is not inside text inputs.
- Supported formats: WAV, MP3, OGG, FLAC, M4A, AAC, and WMA.
- Session scope: Imported files and analysis results are kept in memory for the current session only.

## Analysis and Metadata
- Waveform and duration: Each file is decoded locally to generate waveform peaks and duration. Waveforms support drag-to-seek playback.
- Duplicate detection: A SHA-256 hash of file bytes is computed on import. If a hash matches a previously imported file (or a file in the same batch), the file is flagged as a duplicate.
- Key detection: If enabled in Settings, the app can detect musical key on demand for selected files or all files. Detected keys include a confidence score and can update filenames if the active naming pattern includes {key}.
- BPM detection: The desktop build uses aubiotrack (aubio) to estimate BPM and confidence on import when a file path is available. BPM can be edited manually on each track.
- Silence analysis: A dedicated action scans RMS energy in 100 ms windows to flag silent or near-silent files. The scan can be run on all files or only the current selection, and it shows progress with cancel support.

## Categorization Rules
- Auto-categorization uses keyword matching against the current category list. Categories can be added, archived, deleted, or restored to defaults.
- Archived categories are hidden from auto-categorization but preserve existing file assignments.
- Deleting a category prompts for optional reassignment of existing files in that category.

Default categories and keywords:

| Category | Keywords |
| --- | --- |
| Drums | kick, bd, 808, snr, snare, rim, hat, hh, openhat, ride, crash, tom, shaker, clap, perc, percussion, drum, fill, drums |
| Bass | bass, sub, 808, lowend, reese, pluckbass, subbass |
| Synths | synth, lead, pad, arp, chord, pluck, keys, melody, saw, square, supersaw |
| FX | fx, effect, riser, sweep, impact, downlifter, uplifter, noise, transition, reverse, dropfx, hit, ambience, sfx |
| Vox | vox, vocal, voice, chant, adlib, phrase, acapella, talk, shout |
| Instruments | gtr, guitar, piano, key, organ, string, violin, brass, horn, flute, trumpet, sax, instrument, pluck, harp |
| Background | background, ambient, atmos, texture, soundscape, drone, env, space, field |
| Other | Fallback when no keyword matches |

## Auto Rename Behavior
- Auto-rename can be run on selected files or all files. A preview dialog shows current and new names before applying changes.
- Auto rename uses keyword rules to clean names, normalize case, and attach categories, then ensures uniqueness by adding incremental suffixes like `_2`.
- When files with incremented suffixes are deleted, remaining files are renumbered to remove gaps.

Rename keyword rules used during auto rename:

| Replacement | Keywords |
| --- | --- |
| Kick | kick, bd, kck, subkick, lowkick |
| Snare | snare, snr, rim, rims |
| Clap | clap, handclap |
| HiHat | hat, hh, hihat, closedhat, openhihat, openhat |
| Percussion | perc, percussion, bongo, conga, tom, shaker, tamb, tambourine |
| DrumLoop | drumloop, drum_loop, toploop |
| Guitar | gtr, guitar, acoustic, electricgtr, plucked, strum |
| Piano | piano, keys, rhodes, epiano |
| Strings | string, violin, cello, strings, orchestra, harp |
| Brass | brass, trumpet, trombone, horn |
| Woodwind | flute, woodwind, sax, clarinet |
| Synth | synth, lead, pad, pluck, arp, seq, saw, square, poly, mono |
| Reese | reese, basslead |
| Bass | bass, sub, 808, lowend, lowsub |
| FX | effect, impact, sweep, riser, fall, downlifter, uplifter, boom, fx, ambience, sfx |
| NoiseFX | white, whoosh, wash |
| Transition | drop, fill, transition |
| Vocal | vox, vocal, voice, chant, shout, phrase, adlib, acapella, bgv, backing |
| Background | background, bg, ambient, atmos, texture, drone, space, room, env, field |
| GlitchFX | glitch, granular, stutter, fxloop |
| Artifact | click, pop, noise |
| DrumStem | beat, drums, rhythm |
| Loop | loop |
| Melody | melody, melodic, harm, harmony |
| Chords | chord, chords, progression |

## Naming Patterns
- Naming patterns drive how {name}, {category}, {key}, and {bpm} are combined.
- Missing values are removed cleanly so extra brackets, dashes, and underscores are not left behind.
- When building names, the app strips trailing tokens like existing category or key tags to avoid duplicates.

Preset patterns available in Settings:

- `{name} ({category})`
- `{name} ({category}) [{key}]`
- `{name} ({category}) [{bpm}]`
- `{name} ({category}) [{key}] [{bpm}]`
- `{category} - {name}`
- `{category} - {name} [{key}]`
- `{name}_{category}`
- `{name}_{category}_{key}`
- `{name}`
- `{name} ({key})`
- Custom pattern

## Track Review and Editing
- Each track card shows waveform, duration, and status badges for silent or duplicate files.
- Playback supports play and pause with drag-to-seek, and optional reset-to-start behavior.
- Names can be edited by double-clicking a track name.
- Categories can be changed per track via a dropdown.
- Keys can be selected from a list; BPM can be edited inline.
- A tuner button opens the Chromatic Tuner for detailed pitch analysis.
- Selection checkboxes enable batch actions such as delete selected and restore original names.
- An undo stack stores prior states with a configurable history depth.

## Organization and Search
- Search filters by filename, category, or key.
- Organization modes include group by category, alphabetical A-Z, alphabetical Z-A, and import order (newest first).
- Files can be dragged to reorder the list manually.

## Cleaning Tools
- Analyze Silence flags silent or near-silent audio and shows progress.
- Delete Silent removes all files flagged as silent.
- Remove Duplicates removes all files flagged as duplicates.
- Deleting or removing files updates incremented names to maintain numbering order.

## Export
- If files are selected, export includes only the selected files.
- If no files are selected, export includes all non-silent files.
- Export options include folder copy or ZIP archive, and categorized or flat structure.
- When exporting categorized folders, the app warns if any files are in the "Other" category.
- Export shows progress and supports cancel.
- ZIP exports are saved with a timestamped name like `Pulse_Export_<timestamp>.zip`.

## Settings and Preferences
- Processing and analysis: auto-rename on import, enable key detection, toggle notifications.
- Track display: show or hide BPM, key, category, and tuner controls on each track.
- Naming: select a preset pattern or enter a custom pattern.
- Playback: reset waveform position on stop or track change.
- History: configure max undo depth.
- Export defaults: format and folder structure.
- Appearance: theme selection and waveform color override.
- About and updates: show version and check for updates.

## Chromatic Tuner
- Plays the selected sample with a waveform seek bar.
- Analyzes pitch to show dominant note, frequency, and cents offset.
- Visualizes a chroma spectrum across 12 notes.
- Lists the top 5 spectral peaks by strength.
- Provides a suggested key with a confidence score.
- Allows manual key selection and confirmation back to the track.

## Onboarding
- The first-run overlay guides users through settings, categories, and import workflow.
- File import is disabled until onboarding is completed or skipped.

## Shortcuts
- Space: play or pause the focused track, otherwise toggle the current playing track.
- Ctrl or Cmd + F: focus the search field.
- Ctrl or Cmd + A: select all files.
- Ctrl or Cmd + Z: undo the last action.

## Local-First and Data Storage
- All analysis runs locally; no files are uploaded.
- Original files are never modified.
- Exports create new copies with the chosen names and folder structure.
- Categories and settings are stored in localStorage.
- The active file list and analysis results are session-only and not persisted between launches.

## Platform Notes
- Desktop features rely on the Tauri runtime for native file dialogs, drag and drop, and updates.
- BPM detection on Linux requires the `aubio-tools` package. Windows and macOS use bundled aubiotrack binaries.
- If a file path is not available (for example, in a browser-only session), key and BPM detection may not run.
