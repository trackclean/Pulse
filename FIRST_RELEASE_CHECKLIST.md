# First Release Checklist & Open Source Readiness

Complete checklist for launching Pulse as an open source project with the first Windows release.

---

## ✅ Pre-Release Checklist

### Code & Documentation
- [x] Updated README.md with accurate features
- [x] Updated website content (BPM manual entry)
- [x] Website shows "Windows Available, Coming Soon for Mac/Linux"
- [x] Created WINDOWS_BUILD_GUIDE.md
- [x] Created DEPLOY_WEBSITE.md
- [x] Created GITHUB_PAGES_QUICK.md
- [x] Updated CHANGELOG.md (if applicable)
- [x] All essential open source files present:
  - [x] LICENSE (MIT)
  - [x] CODE_OF_CONDUCT.md
  - [x] CONTRIBUTING.md
  - [x] SECURITY.md

### Repository Cleanup
- [x] Removed test-results/ directory
- [x] Removed temporary PNG screenshots (full-page-preview.png, etc.)
- [x] Updated .gitignore with test artifact patterns
- [x] No backup or workspace files in repo
- [x] No secrets or API keys in any files

### Version Management
- [ ] **MANUAL**: Update version in `package.json`
  - Current: 1.0.8 → Desired: 1.0.9 (or your version)
  - Also check `src-tauri/tauri.conf.json` for version match

### Testing (Optional but Recommended)
- [ ] **MANUAL**: Tested Windows build locally
  - Drag & drop files
  - View waveforms
  - Edit BPM manually
  - Export files
- [ ] **MANUAL**: Check browser console for errors (press F12)
- [ ] **MANUAL**: Test on clean Windows install (or virtual machine)

---

## 🚀 Release Steps (Manual)

Follow these steps in order to create your first release:

### Step 1: Prepare Your Machine
```bash
cd "C:\Users\[YourUsername]\OneDrive\Dokumenti\CODING PROJECTS\clean-track-buddy\clean-track-buddy"
npm install
```

### Step 2: Update Version (Required)
1. Open `package.json`
2. Find: `"version": "1.0.8"`
3. Change to: `"version": "1.0.9"` (or your desired version)
4. Open `src-tauri/tauri.conf.json`
5. Find: `"version": "1.0.8"`
6. Change to match: `"version": "1.0.9"`
7. Save both files

### Step 3: Commit Version Changes
```bash
git add package.json src-tauri/tauri.conf.json
git commit -m "chore: bump version to 1.0.9 for first Windows release"
git push origin main
```

### Step 4: Build Windows Release
```bash
npm run tauri build
```

**Expected output location:**
```
src-tauri/target/release/Pulse_1.0.9_x64_en-US.msi
```

**Build time:** 5-15 minutes (longer on first build)

**If build fails:**
- Check [WINDOWS_BUILD_GUIDE.md](docs/WINDOWS_BUILD_GUIDE.md) troubleshooting section
- Verify Rust is installed: `rustc --version`
- Verify Node.js is 18+: `node --version`
- Clean and rebuild: `npm run tauri build`

### Step 5: Test the Build
1. Find the MSI file: `src-tauri/target/release/Pulse_1.0.9_x64_en-US.msi`
2. Install it (double-click MSI)
3. Run Pulse from Start Menu
4. Test core features:
   - Drag & drop a WAV file
   - See waveform display
   - Click a BPM badge and edit it manually
   - Try exporting

**If something breaks:**
- Note the error
- Fix it in the code
- Rebuild: `npm run tauri build`
- Test again

### Step 6: Create GitHub Release
1. Go to: https://github.com/[username]/Pulse/releases
2. Click **Draft a new release**
3. Fill in:
   - **Tag version**: `v1.0.9` (must start with `v`)
   - **Release title**: `Pulse v1.0.9 - Windows Release (Beta)`
   - **Description**: Copy from [WINDOWS_BUILD_GUIDE.md](docs/WINDOWS_BUILD_GUIDE.md)
4. **Upload file**:
   - Drag & drop: `src-tauri/target/release/Pulse_1.0.9_x64_en-US.msi`
   - Or click "Attach binaries"
5. **Check**: "Set as a pre-release" (since it's Windows-only beta)
6. Click **Publish release**

### Step 7: Verify Release
1. Go to: https://github.com/[username]/Pulse/releases
2. Confirm your release is visible
3. Click the MSI file to test the download link works
4. Test installing from the downloaded file

---

## 📝 What Needs Manual Verification

These items MUST be checked manually before releasing:

1. **GitHub Username**
   - [ ] Replace all `trackclean` with your actual GitHub username
   - Files to check:
     - `package.json` repository URL
     - `README.md` GitHub links
     - `index.html` hero button links
     - `docs/WINDOWS_BUILD_GUIDE.md` documentation links

2. **Version Numbers**
   - [ ] `package.json` version updated
   - [ ] `src-tauri/tauri.conf.json` version updated
   - [ ] Release tag matches (`v1.0.9`)

3. **Download Links**
   - [ ] Update `index.html` download URL to match your release:
     ```html
     href="https://github.com/[USERNAME]/Pulse/releases/download/v1.0.9/Pulse_1.0.9_x64_en-US.msi"
     ```

4. **Donation Settings**
   - [ ] Update PayPal email in `index.html` if accepting donations
   - [ ] Update GitHub Sponsors username if applicable

5. **Features to Test**
   - [ ] Audio file import (drag & drop, file picker)
   - [ ] Waveform displays correctly
   - [ ] Manual BPM entry works
   - [ ] File export functionality
   - [ ] Search bar works
   - [ ] Settings dialog opens
   - [ ] No console errors (F12)

---

## 📋 Open Source Best Practices

Verify your project follows these open source standards:

### Documentation ✅
- [x] **README.md** - Clear project overview, features, installation
- [x] **LICENSE** - MIT license present
- [x] **CONTRIBUTING.md** - Guidelines for contributors
- [x] **CODE_OF_CONDUCT.md** - Community standards
- [x] **SECURITY.md** - Vulnerability reporting process
- [x] **docs/** - Additional guides and documentation

### Code Quality
- [ ] **Linting** - Run: `npm run lint`
- [ ] **No credentials** - Verify no secrets in code:
  ```bash
  git grep -i "password\|api_key\|secret" -- ':(exclude)docs/'
  ```
- [ ] **Dependencies** - Minimal, well-maintained packages
- [ ] **.gitignore** - Proper exclusion of artifacts

### Repository Health
- [ ] **Main branch** - Is default branch
- [ ] **Branch protection** - Consider enabling (GitHub Settings → Branches)
- [ ] **Issue templates** - Create `.github/ISSUE_TEMPLATE/` (optional)
- [ ] **PR templates** - Create `.github/pull_request_template.md` (optional)

### Release Management
- [x] **Version tagging** - Using semver (v1.0.9)
- [x] **Release notes** - Clear description of what's in release
- [ ] **Changelog** - Keep CHANGELOG.md updated
- [x] **Binary distribution** - Through GitHub Releases

---

## 🔧 Post-Release Tasks

After you publish your first release:

### Update Website
- [ ] **index.html** - Update download link to your release URL
- [ ] **Commit & push** changes to trigger GitHub Pages deployment
- [ ] **Verify** website shows correct download button

### Documentation Updates
- [ ] **Update README.md** with release info
- [ ] **Update docs/INDEX.md** with any new guides
- [ ] **Add release notes** to CHANGELOG.md

### Social & Announcements (Optional)
- [ ] Share on:
  - GitHub Discussions
  - Reddit (r/AudioEngineering, r/WeAreTheMusicMakers, etc.)
  - Twitter/X with #AudioProduction #OpenSource
  - Discord music production servers

### Gather Feedback
- [ ] Enable **GitHub Discussions** (Settings → Features → Discussions)
- [ ] Enable **Issues** (Settings → Features → Issues)
- [ ] Create a welcoming environment for users
- [ ] Respond to bug reports and feature requests

---

## ⚠️ Common Issues & Solutions

### Windows Build Fails
**Error:** `Rust not found`
```bash
# Install Rust from https://rustup.rs/
# Or reinstall: rustup self update
```

**Error:** `MSI creation failed`
- Ensure `src-tauri/tauri.conf.json` is valid JSON
- Check for trailing commas
- Try: `cargo build --release` first

### Installation Issues
**User reports:** "MSI won't install"
- Verify Windows 10 or later
- Check Event Viewer for error details
- Ensure 64-bit machine (x64)
- Try running as Administrator

### App Crashes on Launch
- Check Windows Event Viewer
- Verify all dependencies: `npm install`
- Review console output during build
- Check main.rs for Rust errors

---

## 🎯 Success Criteria

Your first release is successful when:

✅ Windows MSI installer downloads without errors
✅ User can install the app on Windows 10+
✅ App launches without crashing
✅ Core features work: import, analyze, export
✅ Website shows download link
✅ GitHub Release page shows your binary
✅ You have a foundation for future releases (macOS, Linux, updates)

---

## 📞 Need Help?

- **Build Issues**: Check [docs/WINDOWS_BUILD_GUIDE.md](docs/WINDOWS_BUILD_GUIDE.md)
- **Deployment Issues**: Check [DEPLOY_WEBSITE.md](DEPLOY_WEBSITE.md)
- **General Questions**: Review README.md and docs/

---

**Congratulations on your first release! 🎉**

You've successfully created an open source audio tool. Now focus on gathering feedback and planning your next release.

---

*Created: May 2026*
*Last Updated: May 20, 2026*
