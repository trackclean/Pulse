<div align="center">

# Pulse

**Local-first audio sample cleaner & organizer**

[![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](#platform-notes)

Ingest audio files, analyze them locally, and export curated sample packs — without ever modifying your originals.
Built for stem organizing when starting a new session (mixing & mastering), as well as for organizing samples and sample packs.

> **Note**: The first public release (v1.0.10) is Windows-only. macOS and Linux releases are coming soon.

---

</div>

## Core Workflow

```
Settings & Categories  ➜  Import Audio  ➜  Analyze  ➜  Clean & Organize  ➜  Export
```

1. Configure naming, export, and category rules in **Settings** and **Categories**.
2. Import audio via drag & drop, file picker, or clipboard paste.
3. Let the app analyze files for waveform, duplicates, and key.
4. Optionally run silence analysis and auto-rename with preview.
5. Review, edit, and organize files.
6. Export selected files or all non-silent files to a folder or ZIP.

---

## Importing Audio

| Method | Details |
| :--- | :--- |
| **Drag & drop** | Supports both browser drag & drop and native Tauri drag & drop from the OS file explorer. |
| **File picker** | Uses the Tauri file dialog when available, with a browser file input fallback. |
| **Clipboard paste** | Pasting audio file items from the OS file explorer imports them when focus is not inside text inputs. |

**Supported formats:** `WAV` `MP3` `OGG` `FLAC` `M4A` `AAC` `WMA`

> Imported files and analysis results are kept in memory for the current session only.

---

## Analysis & Metadata

### Waveform & Duration
Each file is decoded locally to generate waveform peaks and duration. Waveforms support drag-to-seek playback.

### Track Type Classification
On import, each file is classified as either a **sample** or a **stem** based on duration:

| Type | Criteria |
| :--- | :--- |
| **Sample** | Duration under 2 minutes |
| **Stem** | Duration 2 minutes or longer |
| **Stem** | 3+ files sharing the same duration (within 0.5s) and each >= 2 minutes — DAW stem export detection |

### Duplicate Detection
A SHA-256 hash of file bytes is computed on import. If a hash matches a previously imported file (or a file in the same batch), the file is flagged as a duplicate.

### Key Detection
If enabled in Settings, the app can detect musical key on demand for selected files or all files. Detected keys include a confidence score and can update filenames if the active naming pattern includes `{key}`.

### Silence Analysis
A dedicated action scans RMS energy in 100 ms windows to flag silent or near-silent files. The scan can be run on all files or only the current selection, and it shows progress with cancel support. Audio data is fetched from disk for Tauri drag & drop files to ensure accurate analysis.

---

## Categorization Rules

Auto-categorization uses keyword matching against the current category list. Categories can be added, archived, deleted, or restored to defaults.

- **Archived** categories are hidden from auto-categorization but preserve existing file assignments.
- **Deleting** a category prompts for optional reassignment of existing files in that category.

### Default Categories

| Category | Keywords |
| :--- | :--- |
| **Drums** | `kick` `bd` `808` `snr` `snare` `rim` `hat` `hh` `openhat` `ride` `crash` `tom` `shaker` `clap` `perc` `percussion` `drum` `fill` `drums` |
| **Bass** | `bass` `sub` `808` `lowend` `reese` `pluckbass` `subbass` |
| **Synths** | `synth` `lead` `pad` `arp` `chord` `pluck` `keys` `melody` `saw` `square` `supersaw` |
| **FX** | `fx` `effect` `riser` `sweep` `impact` `downlifter` `uplifter` `noise` `transition` `reverse` `dropfx` `hit` `ambience` `sfx` |
| **Vox** | `vox` `vocal` `voice` `chant` `adlib` `phrase` `acapella` `talk` `shout` |
| **Instruments** | `gtr` `guitar` `piano` `key` `organ` `string` `violin` `brass` `horn` `flute` `trumpet` `sax` `instrument` `pluck` `harp` |
| **Background** | `background` `ambient` `atmos` `texture` `soundscape` `drone` `env` `space` `field` |
| **Other** | *Fallback when no keyword matches* |

---

## Auto Rename

- Auto-rename can be run on selected files or all files. A **preview dialog** shows current and new names before applying changes.
- Auto rename uses keyword rules to clean names, normalize case, and attach categories, then ensures uniqueness by adding incremental suffixes like `_2`.
- When files with incremented suffixes are deleted, remaining files are renumbered to remove gaps.

<details>
<summary><strong>Rename Keyword Rules</strong></summary>

| Replacement | Keywords |
| :--- | :--- |
| **Kick** | `kick` `bd` `kck` `subkick` `lowkick` |
| **Snare** | `snare` `snr` `rim` `rims` |
| **Clap** | `clap` `handclap` |
| **HiHat** | `hat` `hh` `hihat` `closedhat` `openhihat` `openhat` |
| **Percussion** | `perc` `percussion` `bongo` `conga` `tom` `shaker` `tamb` `tambourine` |
| **DrumLoop** | `drumloop` `drum_loop` `toploop` |
| **Guitar** | `gtr` `guitar` `acoustic` `electricgtr` `plucked` `strum` |
| **Piano** | `piano` `keys` `rhodes` `epiano` |
| **Strings** | `string` `violin` `cello` `strings` `orchestra` `harp` |
| **Brass** | `brass` `trumpet` `trombone` `horn` |
| **Woodwind** | `flute` `woodwind` `sax` `clarinet` |
| **Synth** | `synth` `lead` `pad` `pluck` `arp` `seq` `saw` `square` `poly` `mono` |
| **Reese** | `reese` `basslead` |
| **Bass** | `bass` `sub` `808` `lowend` `lowsub` |
| **FX** | `effect` `impact` `sweep` `riser` `fall` `downlifter` `uplifter` `boom` `fx` `ambience` `sfx` |
| **NoiseFX** | `white` `whoosh` `wash` |
| **Transition** | `drop` `fill` `transition` |
| **Vocal** | `vox` `vocal` `voice` `chant` `shout` `phrase` `adlib` `acapella` `bgv` `backing` |
| **Background** | `background` `bg` `ambient` `atmos` `texture` `drone` `space` `room` `env` `field` |
| **GlitchFX** | `glitch` `granular` `stutter` `fxloop` |
| **Artifact** | `click` `pop` `noise` |
| **DrumStem** | `beat` `drums` `rhythm` |
| **Loop** | `loop` |
| **Melody** | `melody` `melodic` `harm` `harmony` |
| **Chords** | `chord` `chords` `progression` |

</details>

---

## Naming Patterns

Naming patterns drive how `{name}`, `{category}`, and `{key}` are combined.
Missing values are removed cleanly so extra brackets, dashes, and underscores are not left behind.
When building names, the app strips trailing tokens like existing category or key tags to avoid duplicates.

### Preset Patterns

| Pattern | Example Output |
| :--- | :--- |
| `{name} ({category})` | `Kick_01 (Drums)` |
| `{name} ({category}) [{key}]` | `Kick_01 (Drums) [Cmaj]` |
| `{category} - {name}` | `Drums - Kick_01` |
| `{category} - {name} [{key}]` | `Drums - Kick_01 [Cmaj]` |
| `{name}_{category}` | `Kick_01_Drums` |
| `{name}_{category}_{key}` | `Kick_01_Drums_Cmaj` |
| `{name}` | `Kick_01` |
| `{name} ({key})` | `Kick_01 (Cmaj)` |
| *Custom pattern* | *User-defined* |

---

## Track Review & Editing

- Each track card shows **waveform**, **duration**, and **status badges** for silent or duplicate files.
- Playback supports play/pause with **drag-to-seek**, and optional reset-to-start behavior.
- Names can be edited by **double-clicking** a track name.
- Categories can be changed per track via a **dropdown**.
- Keys can be selected from a list.
- A tuner button opens the **Chromatic Tuner** for detailed pitch analysis.
- Selection checkboxes enable batch actions such as delete selected and restore original names.
- An **undo stack** stores prior states with a configurable history depth.

---

## Organization & Search

| Feature | Details |
| :--- | :--- |
| **Search** | Filters by filename, category, or key. |
| **Group by category** | Groups tracks under their assigned category headers. |
| **Alphabetical A-Z** | Sorts tracks alphabetically, ascending. |
| **Alphabetical Z-A** | Sorts tracks alphabetically, descending. |
| **Import order** | Sorts by import time, newest first. |
| **Manual reorder** | Drag tracks to reorder the list manually. |

---

## Cleaning Tools

| Tool | Action |
| :--- | :--- |
| **Analyze Silence** | Flags silent or near-silent audio and shows progress. |
| **Delete Silent** | Removes all files flagged as silent. |
| **Remove Duplicates** | Removes all files flagged as duplicates. |

> Deleting or removing files updates incremented names to maintain numbering order.

---

## Export

- If files are **selected**, export includes only the selected files.
- If **no files are selected**, export includes all non-silent files.
- Export options include **folder copy** or **ZIP archive**, and **categorized** or **flat** structure.
- When exporting categorized folders, the app warns if any files are in the "Other" category.
- Export shows progress and supports cancel.
- ZIP exports are saved with a timestamped name like `Pulse_Export_<timestamp>.zip`.

---

## Settings & Preferences

| Tab | Options |
| :--- | :--- |
| **Processing** | Auto-rename on import, enable key detection, toggle notifications. |
| **Track Display** | Show or hide key, category, and tuner controls on each track. |
| **Naming** | Select a preset pattern or enter a custom pattern. |
| **Playback** | Reset waveform position on stop or track change. |
| **History** | Configure max undo depth. |
| **Export** | Default format and folder structure. |
| **Appearance** | Theme selection and waveform color override. |
| **About** | Version info and check for updates. |

---

## Chromatic Tuner

- Plays the selected sample with a **waveform seek bar**.
- Analyzes pitch to show **dominant note**, **frequency**, and **cents offset**.
- Visualizes a **chroma spectrum** across 12 notes.
- Lists the **top 5 spectral peaks** by strength.
- Provides a **suggested key** with a confidence score.
- Allows manual key selection and confirmation back to the track.

---

## Onboarding

The first-run overlay guides users through settings, categories, and import workflow.
File import is disabled until onboarding is completed or skipped.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Play/pause the focused track, or toggle the current playing track. |
| `Ctrl/Cmd + F` | Focus the search field. |
| `Ctrl/Cmd + A` | Select all files. |
| `Ctrl/Cmd + Z` | Undo the last action. |

---

## Privacy & Data

- All analysis runs **locally** — no files are uploaded.
- Original files are **never modified**.
- Exports create new copies with the chosen names and folder structure.
- Categories and settings are stored in `localStorage`.
- The active file list and analysis results are **session-only** and not persisted between launches.

---

## Platform Notes

| Platform | Notes |
| :--- | :--- |
| **Windows** | Full feature set. |
| **macOS** | Coming Soon — Full feature set. |
| **Linux** | Coming Soon — Full feature set. |
| **Browser** | Key detection may not run without file path access. |

> Desktop features rely on the Tauri runtime for native file dialogs, drag & drop, and updates.

---

## Installation

Download the latest release for your platform from the [Releases](https://github.com/trackclean/Pulse/releases) page.

**Currently Available:**
| Platform | Format | Status |
| :--- | :--- | :--- |
| Windows | `.exe` installer | ✅ Available |
| macOS | `.dmg` | Coming Soon |
| Linux | `.AppImage` or `.deb` | Coming Soon |

**Note**: The first public release (v1.0.10) is Windows-only for testing. macOS and Linux releases are in development.

---

<div align="center">

**Made for producers, by producers.**

</div>
