# Clean Track Buddy - Landing Page

A beautiful static GitHub Pages website for **Clean Track Buddy**, a local-first audio sample cleaner and organizer built with Tauri and React.

## 📋 Table of Contents

- [About Clean Track Buddy](#about-clean-track-buddy)
- [Features](#features)
- [Installation](#installation)
- [Customization](#customization)
- [Deployment](#deployment)

## 🎵 About Clean Track Buddy

Clean Track Buddy is a powerful tool for audio sample curation. It helps you:
- **Import** audio files (WAV, MP3, OGG, FLAC, M4A, AAC, WMA) via drag-and-drop or file picker
- **Analyze** for silence, duplicates, and musical key detection
- **Organize** with auto-rename, custom categories, and manual editing
- **Export** as folder structures or zip archives

All processing happens locally on your machine—your audio files never leave your computer.

## ✨ Features

- 🔒 **Local-First & Private** - All analysis runs on your machine, no files uploaded
- 🎵 **Silence Detection** - Automatically finds and removes silent or near-silent samples
- 🔄 **Duplicate Detection** - SHA-256 hashing identifies duplicate files instantly
- 🎼 **Musical Key Detection** - Optional key detection with confidence scores (best for tonal material)
- ✏️ **Smart Renaming** - Auto-rename with custom patterns, keywords, and preview before applying
- 📦 **Flexible Export** - Export as folder structures or zip archives, organized by category
- ⌨️ **Keyboard Shortcuts** - Space (play/pause), Ctrl+F (search), Ctrl+A (select all), Ctrl+Z (undo)
- 🔙 **Non-Destructive** - Original files are never modified; exports are new copies

## 🚀 Installation

### Download Installers

Visit the [Releases Page](https://github.com/trackclean/clean-track/releases) to download Clean Track Buddy for your platform:

**Linux:** AppImage or .deb installer  
**macOS:** DMG installer (Universal for Intel and Apple Silicon)  
**Windows:** MSI or EXE installer  

### From Source

To build from source:

```bash
git clone https://github.com/trackclean/clean-track.git
cd clean-track
npm install
npm run tauri build
```

## 🎨 Customization

This landing page is fully customizable. Key areas to update:

### Colors

Edit `style.css` to customize the color scheme:

```css
:root {
    --primary-color: #0066cc;      /* Main blue */
    --primary-dark: #0052a3;       /* Dark blue */
    --secondary-color: #28a745;    /* Green buttons */
    /* ... more colors ... */
}
```

### Content

Edit `index.html` to update:
- **Hero Section** - Headline and subheading
- **Features** - Update feature cards to match your app
- **Download Section** - Ensure download links point to current releases
- **Donate Section** - Update PayPal email and GitHub Sponsors link
- **Footer** - Links to GitHub, documentation, etc.

### Branding

Replace emoji icons with custom graphics:
- Update icons in the features section
- Add your app logo/icon
- Create a favicon and save as `favicon.ico` in the root directory

## 📁 File Structure

```
.
├── index.html              # Landing page
├── style.css               # Styling and responsive design
├── script.js               # Interactive functionality
├── README.md               # This file
├── QUICKSTART.md           # Quick setup guide
├── CNAME.template          # Custom domain template
├── .gitignore              # Git ignore rules
└── .github/
    └── workflows/
        └── pages.yml       # GitHub Pages deployment workflow
```

## 🔍 GitHub Pages Deployment

This site is automatically deployed via GitHub Pages when you push to the `main` branch.

### Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Select **Deploy from a branch**
3. Choose `main` branch and `/` (root) folder
4. Click **Save**
5. Site will be live at: `https://trackclean.github.io/clean-track/`

### Custom Domain

To use a custom domain:
1. Create a `CNAME` file with your domain (see `CNAME.template`)
2. Configure domain DNS to point to GitHub Pages
3. Update domain settings in repository **Settings** → **Pages**

## 💡 Tips

### Analytics

Add Google Analytics to track site visitors:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

### Social Media

Update footer links to point to your community:

```html
<div class="footer-links">
    <a href="https://github.com/trackclean/clean-track">GitHub</a>
    <a href="https://discord.gg/yourserver">Discord</a>
</div>
```

### Version Updates

When releasing new versions:
1. Update version numbers in `index.html`
2. Update download links to GitHub releases
3. Push to trigger automatic GitHub Pages rebuild

## 🤝 Contributing

Clean Track Buddy is open source! Help improve the project:

- **Report bugs** via [GitHub Issues](https://github.com/trackclean/clean-track/issues)
- **Suggest features** with feature request issues
- **Submit PRs** for bug fixes or improvements
- **Write documentation** and guides

See [CONTRIBUTING.md](https://github.com/trackclean/clean-track/blob/main/CONTRIBUTING.md) for details.

## 📝 License

Clean Track Buddy is licensed under the MIT License. See [LICENSE](https://github.com/trackclean/clean-track/blob/main/LICENSE) for details.

## 🆘 Troubleshooting

### Site not showing up
- Wait 2-5 minutes for GitHub Pages to build
- Check **Settings** → **Pages** to verify deployment
- Ensure branch is set to `main` and folder is `/`

### Download links not working
- Verify release URLs match your actual GitHub releases
- Check version numbers are correct
- Test links in a new browser window

### Need Help?

- [GitHub Issues](https://github.com/trackclean/clean-track/issues) - Report bugs or request features
- [GitHub Discussions](https://github.com/trackclean/clean-track/discussions) - Ask questions
- [Documentation](https://github.com/trackclean/clean-track) - See the main repo

---

**Supported Audio Formats:** WAV, MP3, OGG, FLAC, M4A, AAC, WMA

**Built with:** Tauri + React | **Always free and local-first** 🔒

Visit the [main repository](https://github.com/trackclean/clean-track) for the app and full documentation.