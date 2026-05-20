# GitHub Pages Deployment & Limitations

## ⚠️ Important: Tauri Apps Cannot Be Fully Deployed on GitHub Pages

**Pulse** is a **desktop application** built with [Tauri](https://tauri.app/), not a traditional web app. This means:

### What Works on GitHub Pages
- **Landing page** (`index.html`) ✅
- Static website content (docs, screenshots, download links) ✅
- Information pages and marketing content ✅

### What Does NOT Work on GitHub Pages
- **The full Pulse application** ❌
- File system access (Tauri's core feature) ❌
- Native file dialogs ❌
- Drag & drop from OS file explorer ❌
- Audio analysis features ❌
- Native binaries ❌

---

## Why GitHub Pages Can't Host Pulse

GitHub Pages is a **static file host** for web content. Pulse requires:

1. **Tauri Runtime** — A native backend that handles file I/O, system APIs, and audio processing
2. **Native Binaries** — `.exe` (Windows), `.dmg` (macOS), `.AppImage` (Linux)
3. **Security Sandbox** — Browser security policies prevent the file access Pulse needs

When you deploy Pulse's frontend to GitHub Pages, it's just the UI without the backend — no functionality works.

---

## How to Properly Deploy Pulse

### Option 1: Desktop Application (Recommended) ✅
Distribute compiled binaries as GitHub Releases:

```bash
npm install
npm run tauri build
```

Creates:
- `src-tauri/target/release/pulse.exe` (Windows)
- `src-tauri/target/release/Pulse.app` (macOS)
- `src-tauri/target/release/pulse` (Linux AppImage)

Upload these to [GitHub Releases](https://github.com/trackclean/Pulse/releases) for users to download and install.

### Option 2: Landing Page Only
Use GitHub Pages for your **landing page and documentation** only:

1. Go to **Settings** → **Pages**
2. Select **Deploy from a branch** → `main` branch → root folder
3. GitHub Actions will build and deploy `index.html` automatically

This serves your marketing website and download links, but NOT the app itself.

---

## Current GitHub Actions Workflows

### `deploy-pages.yml`
- **Purpose**: Builds the Vite frontend and uploads to GitHub Pages
- **Status**: Works, but only deploys the static landing page
- **Result**: Live website at `https://trackclean.github.io/Pulse/`
- **Limitation**: The app interface is not functional without Tauri backend

### `static.yml`
- **Purpose**: Alternative static deployment (deprecated, conflicts with `deploy-pages.yml`)
- **Recommendation**: Remove or disable this to avoid conflicts

---

## What the Current Setup Does

The `vite.config.ts` includes:
```javascript
base: process.env.GITHUB_PAGES ? '/Pulse/app/' : './',
```

This changes the asset base path for GitHub Pages, but it **does not** enable Tauri functionality. The deployed site is non-functional as an audio app.

---

## Recommended Solution

1. **Keep the landing page on GitHub Pages** — Use it to market Pulse and provide download links
2. **Distribute desktop binaries via GitHub Releases** — Users download `.exe`, `.dmg`, or `.AppImage` and run natively
3. **Optionally: Deploy a lite web version** — Create a separate, feature-limited web app without file system access (advanced)

---

## For Users

To use Pulse:
1. Download from [GitHub Releases](https://github.com/trackclean/Pulse/releases)
2. Install on your operating system
3. Run the desktop app — all features work locally

The GitHub Pages website is for **information only**, not for using the app.

---

## For Developers

If you want to deploy a **web-only version** with limited features:

1. Create a new branch: `web-lite`
2. Modify components to work without Tauri (no file system, no native drag & drop)
3. Use Web Audio API only (limited analysis features)
4. Deploy to a service like Vercel, Netlify, or GitHub Pages

This is complex and currently not recommended.

---

**Conclusion**: GitHub Pages is designed for static websites, not native applications. Pulse must be distributed as a desktop application via GitHub Releases.
