# Quick Start: Auto-Updates

## First Time Setup

1. **Generate signing keys** (only once):
   ```powershell
   npm run tauri signer generate -- -w $env:USERPROFILE\.tauri\clean-track-buddy.key
   ```
   
2. **Copy the public key** from the output and paste it in `src-tauri/tauri.conf.json`:
   ```json
   "pubkey": "YOUR_PUBLIC_KEY_HERE"
   ```

## Creating a Release

Use the automated release script:

```powershell
.\scripts\release.ps1 -Version "1.0.1" -ReleaseNotes "Added new features and bug fixes"
```

This will:
- ✅ Update version in all files
- ✅ Build the application
- ✅ Sign the installers
- ✅ Generate `latest.json`

## Publishing to GitHub

1. Go to: https://github.com/gerigazda0/clean-track-buddy/releases/new

2. Create a new tag: `v1.0.1`

3. Upload these files from `src-tauri/target/release/bundle/`:
   - `msi/*.msi`
   - `msi/*.msi.sig`
   - `latest.json`

4. Add release notes and click "Publish release"

## That's it! 🎉

Users with the app installed will automatically receive update notifications when they launch the app.

---

## Manual Process (if script fails)

If you prefer to do it manually or the script fails:

1. **Update versions** in:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`

2. **Build**:
   ```powershell
   npm run tauri build
   ```

3. **Sign**:
   ```powershell
   # Replace X.X.X with the actual version number (e.g., 1.0.5)
   npm run tauri signer sign $env:USERPROFILE\.tauri\clean-track-buddy.key --file "src-tauri/target/release/bundle/msi/clean-track-buddy_X.X.X_x64_en-US.msi"
   ```

4. **Create `latest.json`** manually using this template:
   ```json
   {
     "version": "X.X.X",
     "notes": "Release notes here",
     "pub_date": "2026-01-01T00:00:00Z",
     "platforms": {
       "windows-x86_64": {
         "signature": "PASTE_CONTENTS_OF_.msi.sig_FILE_HERE",
         "url": "https://github.com/trackclean/clean-track/releases/download/vX.X.X/clean-track-buddy_X.X.X_x64_en-US.msi"
       }
     }
   }
   ```
   Replace `X.X.X` with the actual version number and update `pub_date` accordingly.

5. **Upload to GitHub** as described above

---

## Troubleshooting

**"Private key not found"**
- Run the key generation command from step 1

**"Build failed"**
- Make sure all dependencies are installed: `npm install`
- Check that Rust is up to date: `rustup update`

**"Signature verification failed"**
- Ensure the public key in `tauri.conf.json` matches your private key
- Re-sign the installer

For more details, see `RELEASE_GUIDE.md`
