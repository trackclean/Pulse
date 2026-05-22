# Bug Report Template

Use this template when reporting bugs or issues with Pulse. Providing detailed information helps identify and fix issues faster.

---

## Environment Information

**Operating System:**
- [ ] Windows 10
- [ ] Windows 11
- [ ] macOS (version: ___________)
- [ ] Linux (distribution: ___________)

**App Version:**
(Example: 1.0.5 - found in Settings or About dialog)

**Install Method:**
- [ ] Downloaded installer (.exe, .msi, .dmg, .AppImage, .deb)
- [ ] Built from source
- [ ] Other: ___________

**System Specs (if relevant):**
- CPU: ___________
- RAM: ___________
- Available Disk Space: ___________

---

## Bug Description

**Summary:**
(One-sentence description of the issue)

**Detailed Description:**
(Explain what went wrong in detail. What were you trying to do? What happened instead?)

---

## Steps to Reproduce

Please provide step-by-step instructions to reproduce the issue:

1.
2.
3.
4.

**Frequency:**
- [ ] Happens every time
- [ ] Happens sometimes (intermittent)
- [ ] Happened only once

---

## Expected Behavior

(Describe what you expected to happen)

---

## Actual Behavior

(Describe what actually happened)

---

## Screenshots / Videos

(If applicable, attach screenshots or screen recordings showing the issue)

**Screenshot 1:**
[Attach or describe]

**Video:**
[Link to video or describe]

---

## Additional Context

**Number of Files Imported:**
(Example: 50 files, 500 files, 1 file, etc.)

**File Formats Involved:**
- [ ] WAV
- [ ] MP3
- [ ] OGG
- [ ] FLAC
- [ ] M4A
- [ ] AAC
- [ ] WMA
- [ ] Other: ___________

**File Sizes:**
(Example: mostly 5-10MB, one 500MB file, etc.)

**Settings Used:**
(Any non-default settings you have enabled)
- Theme: ___________
- Naming pattern: ___________
- Auto-rename on import: ___________
- Key detection enabled: ___________
- Other settings: ___________

**Recent Actions Before Bug:**
(What did you do right before the issue occurred?)

---

## Error Messages / Logs

**Error Message:**
(If you saw an error dialog or notification, paste the exact message here)

```
[Paste error message here]
```

**Console Logs:**
(If you opened Developer Tools, paste any relevant console errors)

```
[Paste console logs here]
```

**System Logs:**
(For advanced users: relevant entries from Event Viewer (Windows), Console.app (macOS), or journalctl (Linux))

```
[Paste system logs here if applicable]
```

---

## Workaround

**Did you find a workaround?**
- [ ] Yes (describe below)
- [ ] No

**Workaround Description:**
(If you found a way to avoid or work around the issue, describe it here)

---

## Impact

**Severity:**
- [ ] Critical (app crashes, data loss, cannot use app)
- [ ] High (major feature broken, significant impact on workflow)
- [ ] Medium (feature partially broken, workaround exists)
- [ ] Low (minor annoyance, cosmetic issue)

**Blocks Work:**
- [ ] Yes, I cannot use the app
- [ ] Partially, I can work around it
- [ ] No, minor issue

---

## Platform-Specific Information

### Windows Users
- **Edge Version:** (Settings > About Microsoft Edge)
- **WebView2 Version:** (Check in Programs & Features)
- **Antivirus Software:** ___________

### macOS Users
- **macOS Version:** (Example: 14.2 Sonoma)
- **Chip:**
  - [ ] Apple Silicon (M1/M2/M3)
  - [ ] Intel
- **File Permissions Granted:**
  - [ ] Yes
  - [ ] No
  - [ ] Not sure

### Linux Users
- **Distribution:** ___________ (Example: Ubuntu 22.04, Fedora 39, Arch)
- **Desktop Environment:** ___________ (Example: GNOME, KDE, XFCE)
- **Display Server:**
  - [ ] X11
  - [ ] Wayland
- **aubio-tools Installed:**
  - [ ] Yes
  - [ ] No
  - [ ] Not sure
- **WebKitGTK Version:** (Run: `dpkg -l | grep webkit2gtk` on Debian/Ubuntu)

---

## Additional Notes

(Any other information that might be helpful)

---

## Example Bug Report

Below is an example of a well-written bug report:

---

### Environment Information
- **OS:** Windows 11
- **App Version:** 1.0.5
- **Install Method:** Downloaded .msi installer
- **System:** Intel i7, 16GB RAM, 500GB free

### Bug Description
**Summary:** App crashes when exporting more than 100 files to ZIP

**Detailed Description:** When I select all 150 files and try to export them as a ZIP archive with categorized folder structure, the export progress reaches about 75% and then the entire app closes without warning or error message.

### Steps to Reproduce
1. Import 150+ audio files (mix of WAV and MP3)
2. Select all files (Ctrl+A)
3. Click Export button
4. Choose "Export to ZIP"
5. Choose "Categorized" folder structure
6. Select save location
7. Click "Export"
8. Wait for progress to reach ~75%

**Frequency:** Happens every time with 150+ files. Works fine with 50 files.

### Expected Behavior
Export should complete successfully and create a ZIP file with all 150 files organized in category folders.

### Actual Behavior
App crashes silently around 75% progress. No ZIP file is created. No error message shown.

### Screenshots
[Screenshot of export dialog before crash]

### Additional Context
- **Files:** 150 files total, mix of WAV (5-10MB) and MP3 (3-5MB)
- **Formats:** WAV and MP3
- **Settings:** Default theme, categorized export, auto-rename enabled
- **Recent Actions:** Just imported all files, categorized them, then tried to export

### Error Messages / Logs
No error message shown. Console logs (from previous attempt before crash):
```
[2026-02-20 14:23:45] Starting export of 150 files...
[2026-02-20 14:23:45] Creating ZIP archive...
[2026-02-20 14:24:12] Exported 75 files...
[2026-02-20 14:24:28] Exported 100 files...
[App crashed here]
```

### Workaround
**Yes** - If I export in batches of 50 files at a time, it works fine. But this is tedious for large libraries.

### Impact
- **Severity:** High (cannot export large batches)
- **Blocks Work:** Partially, workaround exists but inefficient

### Platform-Specific Information
- **Windows 11**
- **Edge Version:** 120.0.2210.144
- **Antivirus:** Windows Defender (default)

### Additional Notes
Memory usage seems to increase rapidly during export. Might be a memory leak issue?

---

**Thank you for your bug report! This helps make Clean Track Buddy better for everyone.**
