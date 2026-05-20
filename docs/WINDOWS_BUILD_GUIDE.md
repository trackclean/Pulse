# Building Your First Windows Release

Complete guide to build and release Pulse for Windows.

---

## Prerequisites

Before building, ensure you have:
- Windows 10 or later
- [Rust](https://rustup.rs/) installed (required for Tauri)
- [Node.js 18+](https://nodejs.org) installed
- Project dependencies installed: `npm install`
- [Git](https://git-scm.com) configured on your machine

To verify everything is installed:
```bash
node --version      # Should show v18+
npm --version       # Should show 8+
rustc --version     # Should show your Rust version
cargo --version     # Should show your Cargo version
```

---

## Step 1: Update Version Number

1. Open `package.json`
2. Find `"version": "1.0.8"`
3. Change to your release version (e.g., `"1.0.9"`)
4. Save and commit:
   ```bash
   git add package.json
   git commit -m "chore: bump version to 1.0.9"
   git push origin main
   ```

---

## Step 2: Build the Windows Executable

Run this command from the project root:

```bash
npm run tauri build
```

**What this does:**
- Builds the React frontend (optimized)
- Compiles the Rust backend
- Creates the Windows installer and portable executable
- Output location: `src-tauri/target/release/`

**Build time:** 5-15 minutes (longer on first build)

**Files created:**
- `Pulse_1.0.9_x64_en-US.msi` — Windows installer (recommended)
- `Pulse_1.0.9_x64-setup.exe` — Setup executable
- `Pulse.exe` — Portable executable (can run without installation)

---

## Step 3: Test the Windows Build

Before releasing:

1. **Run the MSI installer:**
   - Double-click `Pulse_1.0.9_x64_en-US.msi`
   - Follow the installation wizard
   - Launch the app from Start Menu → Pulse

2. **Test core features:**
   - ✅ Drag & drop files
   - ✅ Load audio files
   - ✅ See waveform display
   - ✅ Edit BPM manually
   - ✅ Search functionality
   - ✅ Settings dialog
   - ✅ Export functionality

3. **If everything works:** Great! Move to Step 4
4. **If something breaks:** 
   - Uninstall the app (`Settings` → `Apps`)
   - Fix the issue in code
   - Rebuild: `npm run tauri build`
   - Test again

---

## Step 4: Create GitHub Release

1. Go to your repository on GitHub
2. Click **Releases** (right sidebar)
3. Click **Draft a new release**
4. Fill in:
   - **Tag version**: `v1.0.9` (must match your `package.json` version)
   - **Release title**: `Pulse v1.0.9 - Windows Release (Beta)`
   - **Description**: Copy from template below
5. **Attach files** (Upload the `.msi` file):
   - Click "Attach binaries"
   - Select: `src-tauri/target/release/Pulse_1.0.9_x64_en-US.msi`
6. **Pre-release checkbox**: Check ☑️ (since it's Windows-only beta)
7. Click **Publish release**

### Release Description Template

```markdown
## Pulse v1.0.9 - Windows Beta Release

This is the first public release of Pulse for Windows.

### What's Included
- ✅ Audio file import (WAV, MP3, OGG, FLAC, M4A, AAC, WMA)
- ✅ Waveform visualization
- ✅ Musical key detection
- ✅ Manual BPM entry per track
- ✅ Silence detection
- ✅ Auto-rename with custom patterns
- ✅ Export to folder or ZIP
- ✅ Category-based organization
- ✅ Search and filtering

### Known Limitations
- Windows-only for this release
- macOS and Linux support coming soon
- BPM auto-detection only for audio under 2 minutes

### Installation
1. Download `Pulse_1.0.9_x64_en-US.msi`
2. Run the installer
3. Follow the setup wizard
4. Launch from Start Menu → Pulse

### System Requirements
- Windows 10 or later
- ~100 MB disk space
- No internet required (all processing is local)

### Support
- [Report bugs](https://github.com/[username]/Pulse/issues)
- [Request features](https://github.com/[username]/Pulse/discussions)
- [Read documentation](https://github.com/[username]/Pulse/blob/main/README.md)

**Enjoy Pulse! 🎉**
```

---

## Step 5: Update Website Download Link

Update `index.html` to point to your new release:

```html
<a href="https://github.com/[username]/Pulse/releases/download/v1.0.9/Pulse_1.0.9_x64_en-US.msi" 
   class="btn btn-primary download-btn">
    Download for Windows (v1.0.9)
</a>
```

Replace `[username]` with your GitHub username.

---

## Troubleshooting Build Errors

### "Rust not installed"
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Restart terminal after installation
```

### "MSI creation failed"
- Ensure `src-tauri/tauri.conf.json` is valid JSON
- Check that Rust and cargo are in your PATH
- Try: `cargo build --release` first (separate from Tauri)

### "Build hangs"
- Check disk space (need 2-3 GB free)
- Try killing any existing `cargo` processes
- Restart PowerShell/Terminal

### "App crashes on launch"
- Check Windows Event Viewer for error details
- Verify all dependencies: `npm install`
- Check that `src-tauri/src/main.rs` is valid

---

## Next Steps

Once your Windows release is live:

1. **Update landing page** — Add Windows download button with version
2. **Add "Coming Soon" for Mac/Linux** — Set expectations
3. **Gather feedback** — Monitor issues and discussions
4. **Plan next release** — Include fixes and Mac/Linux builds
5. **Create GitHub Releases page** — Link in README

---

## Build Optimization (Optional)

To reduce installer size:

1. Edit `src-tauri/tauri.conf.json`
2. Look for `bundle.windows.bundle` 
3. Ensure only MSI is enabled (not NSIS)
4. Rebuild: `npm run tauri build`

Result: ~80-100 MB installer (vs 120+ MB with extra bundles)

---

## Support & Issues

If the build fails:
1. Check [Tauri documentation](https://tauri.app/docs)
2. Review [GitHub Discussions](https://github.com/[username]/Pulse/discussions)
3. Open an [issue](https://github.com/[username]/Pulse/issues) with:
   - Error message
   - OS version
   - Node/Rust versions
   - Steps to reproduce

**Good luck with your first release!** 🚀
