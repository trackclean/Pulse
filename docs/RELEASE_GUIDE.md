# Release Guide for Pulse

This guide explains how to create a new release with automatic update support.

## Prerequisites (One-Time Setup)

### 1. Generate Signing Keys

Run this command once to generate your signing keys:

```powershell
npm run tauri signer generate -- -w $env:USERPROFILE\.tauri\clean-track-buddy.key
```

This generates:
- **Private key**: `~/.tauri/clean-track-buddy.key` (keep this SECRET!)
- **Public key**: Displayed in terminal (already in your `tauri.conf.json`)

### 2. Add GitHub Secrets

You need to add the private key to GitHub secrets so the CI can sign releases:

1. Read your private key:
   ```powershell
   Get-Content $env:USERPROFILE\.tauri\clean-track-buddy.key
   ```

2. Go to: https://github.com/gerigazda0/clean-track-buddy/settings/secrets/actions

3. Click "New repository secret" and add:
   - **Name**: `TAURI_SIGNING_PRIVATE_KEY`
   - **Value**: Paste the entire content of the private key file

4. If you set a password when generating the key, also add:
   - **Name**: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
   - **Value**: Your password

**IMPORTANT**: Never commit the private key to git!

## Creating a New Release

### Step 1: Update Version Numbers

Update the version in these 3 files:

1. **package.json**:
   ```json
   "version": "1.0.1"
   ```

2. **src-tauri/tauri.conf.json**:
   ```json
   "version": "1.0.1"
   ```

3. **src-tauri/Cargo.toml**:
   ```toml
   version = "1.0.1"
   ```

### Step 2: Update Changelog (Optional)

Edit `CHANGELOG.md` with your changes:

```markdown
## [1.0.1] - 2025-12-03

### Added
- New feature X

### Fixed
- Bug Y
- Issue Z
```

### Step 3: Commit and Push

```powershell
git add .
git commit -m "Release v1.0.1"
git push
```

### Step 4: Create and Push a Git Tag

```powershell
git tag v1.0.1
git push origin v1.0.1
```

**That's it!** The GitHub Actions workflow will automatically:
1. Build the app for Windows
2. Sign the installer with your private key
3. Create a GitHub release with:
   - The signed `.msi` installer
   - The `.sig` signature file
   - A `latest.json` file for auto-updates
4. Users will automatically get notified of the update when they launch the app!

## How It Works

When you push a tag starting with `v` (like `v1.0.1`):

1. GitHub Actions triggers the release workflow
2. It builds your app on Windows
3. Uses your private key (from secrets) to sign the installer
4. Creates a release with `includeUpdaterJson: true` which generates `latest.json` automatically
5. The app checks `https://github.com/gerigazda0/clean-track-buddy/releases/latest/download/latest.json`
6. If a newer version exists, users see an update dialog

## Troubleshooting

### "TAURI_SIGNING_PRIVATE_KEY not found"
- Make sure you added the GitHub secret (see Prerequisites step 2)

### "Invalid signature"
- The public key in `tauri.conf.json` must match the private key
- Regenerate keys if needed and update the public key

### "Update not detected"
- Check that `latest.json` exists in the latest release
- Version in the release must be higher than the current version
- Check browser console for updater errors

## Manual Release (Alternative)

If you prefer to build locally instead of using GitHub Actions:

```powershell
# Build
npm run tauri build

# Sign (replace version number)
npm run tauri signer sign $env:USERPROFILE\.tauri\clean-track-buddy.key --file "src-tauri/target/release/bundle/msi/clean-track-buddy_1.0.1_x64_en-US.msi"

# Then manually create a GitHub release and upload:
# - clean-track-buddy_1.0.1_x64_en-US.msi
# - clean-track-buddy_1.0.1_x64_en-US.msi.sig
# - latest.json (you'll need to create this manually)
```

## Current Setup Status

✅ Updater configured in `tauri.conf.json`
✅ Public key set
✅ Updater permissions added
✅ GitHub Actions workflow configured
✅ Asset protocol enabled for local files
⚠️ **TODO**: Add `TAURI_SIGNING_PRIVATE_KEY` to GitHub secrets

Once the secret is added, you're fully ready for automatic releases!
