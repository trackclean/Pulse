# GitHub Actions Release Workflow & Auto-Update Testing

Your GitHub Actions workflow is now configured to automatically build and release Windows MSI installers.

---

## 🚀 How It Works

### Automatic Release Process

When you push a version tag, GitHub Actions will:

1. **Build the Windows MSI**
   - Runs on GitHub's Windows server
   - Compiles Rust backend
   - Builds React frontend
   - Creates installer

2. **Generate latest.json**
   - Extracts MSI signature automatically
   - Creates update metadata file
   - Includes version and download URL

3. **Create GitHub Release**
   - Uploads MSI installer
   - Uploads signature file (.msi.sig)
   - Uploads latest.json
   - Adds release notes
   - Sets as pre-release

4. **Enable Auto-Updates**
   - Users can auto-update to this version
   - Signature verified automatically
   - Progress bar shows download status

---

## 📝 How to Release

### Step 1: Update Version
```bash
# Edit two files and change version from 1.0.8 → 1.0.9
package.json          # "version": "1.0.9"
src-tauri/tauri.conf.json  # "version": "1.0.9"
```

### Step 2: Commit & Tag
```bash
git add package.json src-tauri/tauri.conf.json
git commit -m "chore: bump version to 1.0.9"
git tag v1.0.9
git push origin main
git push origin v1.0.9
```

### Step 3: Watch the Workflow
- Go to: https://github.com/[USERNAME]/Pulse/actions
- Look for the "Release Windows Build" workflow
- Watch it build and release

**Time:** 10-15 minutes for build + upload

### Step 4: GitHub Release Created
Once done, check: https://github.com/[USERNAME]/Pulse/releases
- MSI installer (downloadable)
- Signature file
- latest.json (for auto-updates)

---

## 🧪 Testing Auto-Updates

### Scenario 1: Test Update Checking
```
User has: v1.0.8
New release: v1.0.9

1. Install v1.0.8
2. In Settings → "Check for Updates"
3. Should show "Update 1.0.9 available"
4. Download and install happens automatically
5. App restarts with v1.0.9
```

### Scenario 2: Test Auto-Check on Launch
```
1. Install v1.0.8
2. Close app completely
3. Relaunch Pulse
4. Should check for updates automatically
5. Dialog appears if update available
```

### Scenario 3: Test Skip & Later
```
1. Install v1.0.8
2. Click "Check for Updates"
3. Click "Later" button
4. Dialog closes
5. Toast notification shows update still available
6. Click "Update Now" in toast
7. Dialog reopens, allowing you to update
```

### To Test Locally Before Release

**Option A: Modify latest.json endpoint temporarily**
```json
// In src-tauri/tauri.conf.json, point to your test version:
"endpoints": [
  "https://github.com/[USERNAME]/Pulse/releases/download/v1.0.9-test/latest.json"
]
```

**Option B: Use the actual release**
1. Create release with v1.0.9 (using workflow or manually)
2. Install v1.0.8 on your machine
3. Run Pulse and check for updates
4. Should find v1.0.9 automatically

---

## 📋 Workflow File Details

### What Triggers The Workflow
```yaml
on:
  push:
    tags:
      - 'v*'
```

**This triggers on tags starting with `v`:**
- ✅ v1.0.9 → triggers
- ✅ v1.1.0 → triggers
- ✅ v2.0.0 → triggers
- ❌ 1.0.9 (no v prefix) → does NOT trigger

**Always use `v` prefix!**

### What The Workflow Creates
1. **Pulse_1.0.9_x64_en-US.msi** — Main installer
2. **Pulse_1.0.9_x64_en-US.msi.sig** — Digital signature
3. **latest.json** — Update metadata

### Release Automation
The workflow automatically:
- ✅ Extracts version from tag (v1.0.9 → 1.0.9)
- ✅ Gets MSI signature from build artifacts
- ✅ Generates latest.json with correct URLs
- ✅ Creates GitHub Release with all files
- ✅ Sets release as pre-release
- ✅ Uploads all artifacts

---

## 🔍 Monitoring & Troubleshooting

### Check Workflow Status
https://github.com/[USERNAME]/Pulse/actions

### Common Issues

**Workflow Failed: "No artifacts found"**
- Rust compilation error
- Node dependency issue
- Check the workflow logs for details

**Release created but missing files**
- Check if build succeeded (green checkmark)
- View workflow logs under "Jobs"
- Might need to re-run workflow

**Update doesn't appear for users**
- Verify latest.json is uploaded
- Check version number matches tag
- Latest.json URL must be accessible

### View Detailed Logs
1. Go to Actions tab
2. Click the failed run
3. Click "Release Windows Build"
4. See full build output and errors

---

## 🎯 Next Steps

### For v1.0.9 Release
You have two options:

**Option 1: Manual Build (Proven)**
- Follow [FIRST_RELEASE_CHECKLIST.md](FIRST_RELEASE_CHECKLIST.md)
- Build locally on your machine
- Test manually
- Upload to GitHub Release manually

**Option 2: Use Workflow (Automated)**
- Update versions
- Commit and tag: `git tag v1.0.9 && git push origin v1.0.9`
- Workflow builds automatically
- Release created automatically
- Test the auto-update feature

### For Future Releases (v1.1.0+)
Just use the workflow:
```bash
# Update version
git add package.json src-tauri/tauri.conf.json
git commit -m "chore: bump version"
git tag v1.1.0
git push origin main
git push origin v1.1.0
# Wait 10-15 minutes...
# Done! Release is live
```

---

## ⚙️ Customization

### Change Release Notes Template
Edit `.github/workflows/release.yml` line ~73, in the `body:` section:
```yaml
body: |
  ## Your custom release notes here
  - Feature 1
  - Feature 2
  - Bug fixes
```

### Change Release Behavior
- **draft: true** → Release as draft (users can't see it)
- **prerelease: true** → Mark as pre-release (shows "Pre-release" badge)
- **prerelease: false** → Mark as stable release

### Add More Platforms Later
When ready for macOS/Linux:
1. Create separate workflows (`.github/workflows/release-macos.yml`, etc.)
2. Or update this workflow with matrix build for multiple platforms
3. Use Tauri's cross-platform build process

---

## 📊 Comparison: Manual vs Workflow

| Step | Manual | Workflow |
|------|--------|----------|
| Update version | Manual | Manual |
| Commit | Manual | Manual |
| Build | 10-15 min local | 10-15 min GitHub |
| Generate latest.json | Manual | Automatic |
| Create release | Manual | Automatic |
| Upload files | Manual | Automatic |
| **Total time** | ~30 min | ~15 min |
| **Consistency** | Depends on env | Always same |
| **Local testing** | Easy | Harder |

---

## ✅ Ready to Test?

Choose your approach:

**Option A: Test with Workflow (Recommended for v1.1.0+)**
1. Update versions to v1.0.10
2. Run: `git tag v1.0.10 && git push origin v1.0.10`
3. Watch workflow at: Actions tab
4. Test auto-update when release is ready

**Option B: Manual Test First (v1.0.9)**
1. Build locally with `npm run tauri build`
2. Test thoroughly on your machine
3. Manually create release
4. Then use workflow for v1.1.0+

---

**Your automated release system is ready! 🚀**

Questions? Check the workflow file: `.github/workflows/release.yml`
