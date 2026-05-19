# Platform-Specific Testing Notes

This document provides platform-specific considerations, requirements, and known issues for testing Clean Track Buddy on Windows, macOS, and Linux.

---

## Windows Testing

### System Requirements
- **OS**: Windows 10 (version 1809+) or Windows 11
- **WebView**: WebView2 (bundled with Windows 11, may need installation on Windows 10)
- **Prerequisites**: None (all binaries included)

### Specific Testing Areas

#### 1. Path Handling
- **Windows uses backslashes** (`\`) in file paths
- Test file paths with spaces: `C:\Users\User Name\Music\sample.wav`
- Test long paths (>260 characters if possible)
- Test UNC paths (network drives): `\\server\share\file.wav`
- **Known limitation**: UNC paths may not work with Tauri file system APIs

#### 2. WebView2 Integration
- Ensure WebView2 runtime is installed (bundled with app installer)
- WebView2 uses Edge's rendering engine (Chromium-based)
- Test waveform rendering in Edge WebView vs browser
- Audio playback uses Edge's audio codecs

#### 3. File System
- Windows file paths are case-insensitive
- Test special characters in filenames: `Test!@#$%.wav`
- Reserved names (CON, PRN, AUX, NUL) should be handled
- Test creating folders with category names (ensure no reserved names)

#### 4. Audio Codecs
- Windows natively supports: WAV, MP3, WMA
- Other formats (OGG, FLAC, M4A, AAC) rely on WebView2 codecs
- Test all supported formats to ensure playback works

#### 5. BPM Detection (aubiotrack.exe)
- Binary included: `aubiotrack-x86_64-pc-windows-msvc.exe`
- Also requires: `libaubio-5.dll`
- **Antivirus considerations**: Some antivirus software may flag the executable
  - Test with Windows Defender
  - Test with common AV software (Norton, McAfee, Avast)
  - Ensure binaries are signed to reduce false positives

#### 6. File Picker Dialogs
- Uses native Windows file picker dialog
- Test multi-selection (Ctrl+Click)
- Test navigation to different drives (C:, D:, network drives)
- Test folder selection for export

#### 7. Drag and Drop
- Drag files from Windows Explorer
- Test dragging from network locations
- Test dragging from compressed folders (ZIP)
- Drag-drop should show visual feedback (cursor changes)

#### 8. Installation
- **Installer types**: .msi or .exe installer
- Test installation to different locations (Program Files, custom path)
- Test installation without admin rights (if supported)
- Test uninstallation (clean removal, no leftover files)
- Test updating from previous version

#### 9. Updates
- Auto-update uses Tauri updater plugin
- Downloads update from GitHub releases
- Signature verification with pubkey
- Test update download on slow connection
- Test update installation and app restart

### Windows-Specific Issues to Watch For

- **File access permissions**: UAC may block file access in protected folders
- **Antivirus interference**: Real-time scanning may slow down file operations
- **Path length limits**: Windows 10 has 260-character path limit (can be disabled in registry)
- **Multiple audio devices**: Test with different default audio devices (speakers, headphones, HDMI)

### Windows Testing Checklist

- [ ] App installs on Windows 10 and Windows 11
- [ ] WebView2 runtime installs correctly (if not present)
- [ ] Drag-drop from Windows Explorer works
- [ ] File picker opens native Windows dialog
- [ ] All audio formats play correctly
- [ ] BPM detection works (aubiotrack.exe runs)
- [ ] Export creates files with correct Windows paths
- [ ] No antivirus false positives
- [ ] Updates download and install successfully
- [ ] App can be uninstalled cleanly

---

## macOS Testing

### System Requirements
- **OS**: macOS 11 (Big Sur) or later
- **WebView**: WKWebView (built into macOS)
- **Prerequisites**: None (aubiotrack binary included)

### Specific Testing Areas

#### 1. Path Handling
- **macOS uses forward slashes** (`/`) in file paths
- Test paths with spaces: `/Users/username/Music/my sample.wav`
- Test paths with special characters: `/Users/test/file (1).wav`
- Test iCloud Drive paths: `/Users/username/Library/Mobile Documents/`

#### 2. WKWebView Integration
- WKWebView is Apple's WebKit-based webview
- Different rendering from Safari (security sandboxing)
- Test waveform rendering and audio playback
- WKWebView codec support may differ from Safari

#### 3. File System Permissions
- **macOS requires file access permissions**
- First file access triggers permission dialog
- Test that permission dialog appears
- Test file access after granting permissions
- Test file access after denying permissions (should show error)
- Permissions are saved in macOS system settings

#### 4. Gatekeeper and Code Signing
- **First launch may trigger Gatekeeper warning**
- If app is not signed: "App is from an unidentified developer"
- User must right-click app and select "Open" to bypass
- Test both signed and unsigned builds (if applicable)
- **Notarization**: Apps should be notarized for smooth installation
- Test DMG installation flow

#### 5. Audio Codecs
- macOS natively supports: WAV, MP3, AAC, M4A, FLAC
- Test all supported formats for playback
- WMA may not be supported (verify)

#### 6. BPM Detection (aubiotrack)
- Binary included: `aubiotrack-aarch64-apple-darwin` (Apple Silicon)
- Also included: `aubiotrack-x86_64-apple-darwin` (Intel)
- **Universal binary** included for both architectures
- Test on both Apple Silicon (M1/M2/M3) and Intel Macs
- Binary must be signed/notarized or Gatekeeper may block execution

#### 7. File Picker Dialogs
- Uses native macOS file picker (Cocoa)
- Test navigation to different locations (Documents, Downloads, iCloud Drive)
- Test multi-selection (Cmd+Click)
- Test folder selection for export
- Sandboxing may limit file access (Tauri handles this)

#### 8. Drag and Drop
- Drag files from Finder
- Test dragging from different locations (Desktop, Documents, external drives)
- Test dragging from network shares (SMB, AFP)
- Drag-drop should show visual feedback

#### 9. DMG Installation
- **Installer type**: .dmg disk image
- User drags .app to Applications folder
- Test DMG opens correctly
- Test drag-to-install flow
- Test launching from Applications vs Downloads folder

#### 10. Updates
- Auto-update downloads .app.tar.gz from GitHub
- Signature verification with pubkey
- Test update on both Apple Silicon and Intel
- Test update download and installation
- App should restart after update

### macOS-Specific Issues to Watch For

- **Gatekeeper warnings**: Unsigned apps require special handling
- **Permissions**: File access, microphone (if used for key detection)
- **Retina display**: Ensure waveforms render sharply on high-DPI displays
- **Dark mode**: Test UI in both light and dark modes
- **Rosetta**: Intel builds can run on Apple Silicon via Rosetta (test if applicable)
- **Case-sensitive file systems**: Some users have case-sensitive APFS (rare but possible)

### macOS Testing Checklist

- [ ] DMG opens and drag-to-install works
- [ ] App launches on Apple Silicon (M1/M2/M3)
- [ ] App launches on Intel Mac
- [ ] Gatekeeper allows app to run (or shows expected warning)
- [ ] File access permission dialog appears
- [ ] Drag-drop from Finder works
- [ ] File picker opens native macOS dialog
- [ ] All audio formats play correctly
- [ ] BPM detection works (aubiotrack binary runs)
- [ ] Export creates files at chosen location
- [ ] App supports dark mode
- [ ] Waveforms render sharply on Retina displays
- [ ] Updates download and install successfully

---

## Linux Testing

### System Requirements
- **OS**: Ubuntu 20.04+, Fedora 36+, Arch Linux (or similar)
- **WebView**: WebKitGTK 4.0+
- **Prerequisites**:
  - `webkit2gtk-4.0` (or `webkit2gtk-4.1`)
  - `aubio-tools` (for BPM detection)

### Specific Testing Areas

#### 1. Path Handling
- **Linux uses forward slashes** (`/`) in file paths
- Test paths with spaces: `/home/user/Music/my sample.wav`
- Test paths with special characters: `/home/user/file (1).wav`
- Test network mounts: `/mnt/nas/music/`
- Test external drives: `/media/user/USB Drive/`

#### 2. WebKitGTK Integration
- WebKitGTK is the GTK port of WebKit
- Different versions across distros (4.0 vs 4.1)
- Test on multiple distros if possible (Ubuntu, Fedora, Arch)
- WebKitGTK codec support varies by distro

#### 3. Package Dependencies
- **Required at runtime**: `webkit2gtk-4.0` or `webkit2gtk-4.1`
- **Optional for BPM**: `aubio-tools` (system package, not bundled)
- Test installation on fresh system without dependencies
- Test error messages when dependencies missing

#### 4. BPM Detection (aubiotrack)
- **NOT bundled** - uses system `aubiotrack` from PATH
- User must install: `sudo apt install aubio-tools` (Debian/Ubuntu)
- Or: `sudo dnf install aubio` (Fedora)
- Or: `sudo pacman -S aubio` (Arch)
- **Test without aubiotrack installed**: Should show helpful error message
- **Test with aubiotrack installed**: BPM detection should work

#### 5. File Picker Dialogs
- Uses GTK file picker dialog (native look per desktop environment)
- Different appearance in GNOME vs KDE vs XFCE
- Test multi-selection (Ctrl+Click)
- Test navigation to different locations (/home, /mnt, /media)

#### 6. Drag and Drop
- Drag files from file manager (Nautilus, Dolphin, Thunar, etc.)
- Test on different desktop environments (GNOME, KDE, XFCE, i3)
- Drag-drop may behave differently per file manager

#### 7. Audio Codecs
- Codec support depends on GStreamer plugins installed
- Ubuntu typically has: `gstreamer1.0-plugins-base`, `gstreamer1.0-plugins-good`
- For additional formats: `gstreamer1.0-plugins-bad`, `gstreamer1.0-plugins-ugly`
- **Test audio playback for**: WAV, MP3, OGG, FLAC, M4A, AAC
- WMA may require additional codecs
- Missing codecs may cause silent playback or errors

#### 8. Distribution Packaging
- **AppImage**: Universal package, runs on all distros
  - Test AppImage execution: `chmod +x app.AppImage && ./app.AppImage`
  - Test FUSE (may be required for AppImage mounting)
- **DEB**: Debian/Ubuntu package
  - Test installation: `sudo dpkg -i app.deb`
  - Test dependency resolution
- **RPM**: Fedora/RHEL package (if provided)
- **AUR**: Arch User Repository (if provided)

#### 9. Desktop Environment Compatibility
- **GNOME**: GTK-native, should work perfectly
- **KDE Plasma**: Qt-based, GTK apps have different theming
- **XFCE**: Lightweight GTK, should work well
- **i3/Sway**: Tiling window managers, test window behavior
- Test that app looks acceptable in each environment

#### 10. Wayland vs X11
- **X11**: Traditional display server
- **Wayland**: Modern display protocol (default in newer distros)
- Test app on both if possible
- Wayland may have different clipboard/drag-drop behavior

### Linux-Specific Issues to Watch For

- **GStreamer codec issues**: Missing plugins cause audio playback failures
- **WebKitGTK version mismatches**: App may not run on older distros
- **FUSE required for AppImage**: Some minimal systems don't have FUSE installed
- **Theme inconsistencies**: GTK app may look out of place in KDE
- **File permissions**: Export may fail to /root or other protected directories
- **aubio-tools not installed**: BPM detection will fail (should show clear error)

### Linux Testing Checklist

- [ ] App runs on Ubuntu 22.04 LTS
- [ ] App runs on Fedora 39+
- [ ] App runs on Arch Linux (latest)
- [ ] AppImage executes without errors
- [ ] DEB package installs successfully (if provided)
- [ ] WebKitGTK dependency satisfied
- [ ] File picker opens native GTK dialog
- [ ] Drag-drop from file manager works
- [ ] Audio playback works for all formats (with correct GStreamer plugins)
- [ ] BPM detection works when aubio-tools installed
- [ ] BPM detection shows helpful error when aubio-tools missing
- [ ] Export creates files at chosen location
- [ ] App theme matches desktop environment (GNOME/KDE/XFCE)
- [ ] Works on both Wayland and X11

---

## Cross-Platform Testing Matrix

| Feature | Windows | macOS | Linux | Notes |
|---------|---------|-------|-------|-------|
| **Path Separators** | `\` | `/` | `/` | Auto-handled by Tauri |
| **File Picker** | Native | Native | GTK | Platform-specific UI |
| **Drag & Drop** | Explorer | Finder | File Manager | Test each |
| **Audio Codecs** | WebView2 | WKWebView | GStreamer | Codec availability varies |
| **BPM Detection** | Bundled exe | Bundled bin | System package | Linux requires install |
| **Updates** | Auto | Auto | Manual (AppImage) | AppImage can't self-update |
| **Installation** | .exe/.msi | .dmg | .AppImage/.deb | Different flows |
| **Permissions** | UAC | File access | File permissions | Platform-specific |

---

## Testing Priorities by Platform

### High Priority (Test First)
1. **Windows**: File picker, drag-drop, BPM detection, updates
2. **macOS**: Gatekeeper, permissions, drag-drop, BPM detection
3. **Linux**: aubio-tools dependency, GStreamer codecs, AppImage execution

### Medium Priority
1. **Windows**: Antivirus compatibility, UNC paths
2. **macOS**: Rosetta on Apple Silicon, iCloud Drive paths
3. **Linux**: Multiple distros, desktop environments

### Low Priority (Edge Cases)
1. **Windows**: Long paths (>260 chars), reserved filenames
2. **macOS**: Case-sensitive APFS
3. **Linux**: Wayland vs X11, tiling window managers

---

## Resources

- **Main Testing Guide**: [docs/TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Bug Report Template**: [docs/BUG_REPORT_TEMPLATE.md](BUG_REPORT_TEMPLATE.md)
- **Tauri Platform Support**: https://v2.tauri.app/start/prerequisites/
- **WebView2 Downloads**: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- **WebKitGTK**: https://webkitgtk.org/
