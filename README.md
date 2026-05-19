# Clean Track Buddy

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

Clean Track Buddy is a local-first audio sample cleaner and organizer built with **Tauri** and **React**. It ingests audio files, analyzes them on your machine, and helps you rename, categorize, preview, and export curated sample packs without modifying the originals.

**No uploads. No tracking. Pure local processing.** All analysis runs on your machine — nothing leaves your computer.

## 🎵 Features

### Core Workflow
1. Configure naming, export, and category rules in Settings and Categories
2. Import audio via drag & drop, file picker, or clipboard paste
3. Analyze for silence and optional musical key detection
4. Auto-rename with preview, or manually edit names, categories, and keys
5. Export cleaned packs to folders or ZIP archives

### Audio Processing
- **Format Support**: WAV, MP3, OGG, FLAC, M4A, AAC, WMA
- **Waveform Display**: Visual peaks with play/pause and drag-to-seek
- **Silence Detection**: Scans 100ms RMS windows to flag silent files
- **Duplicate Detection**: SHA-256 content hashing during import
- **BPM Detection**: Optional beat-per-minute analysis (aubio-based)
- **Key Detection**: Musical key identification with confidence scores

### Organization & Renaming
- **Auto-Categorization**: Keyword-based rules with customizable categories
- **Smart Renaming**: Pattern-based naming with `{name}`, `{category}`, `{key}` tokens
- **Preview System**: See all changes before applying them
- **Manual Editing**: Double-click to rename, click to change category/key
- **Restore Originals**: Batch restore original filenames

### Export Options
- **Format**: Folder copy or ZIP archive
- **Structure**: Categorized subfolders or flat layout
- **Selection**: Export selected files or all non-silent files
- **Progress**: Real-time feedback with cancel support

### Settings & Appearance
- Auto-rename on import toggle
- Customizable naming patterns and presets
- Theme selection (light/dark/system)
- Custom waveform colors
- Configurable undo history depth
- Built-in update checker (desktop)

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Play/pause current track |
| `Ctrl/Cmd+F` | Focus search box |
| `Ctrl/Cmd+A` | Select all files |
| `Ctrl/Cmd+Z` | Undo |

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18.0.0
- **npm** or **yarn**
- **Rust** (for desktop builds) - [Install here](https://www.rust-lang.org/tools/install)

### Installation

#### Desktop App
Download pre-built installers from the [Releases](https://github.com/gerigazda0/clean-track-buddy/releases) page:
- Windows (`.msi`)
- macOS (`.dmg`)
- Linux (`.AppImage`)

#### Development / Web Version
```bash
# Clone the repository
git clone https://github.com/gerigazda0/clean-track-buddy.git
cd clean-track-buddy

# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run desktop app in dev mode
npm run tauri dev

# Build desktop app
npm run tauri build
```

### System Requirements

#### Linux Users - BPM Detection
To enable BPM detection on Linux, install `aubio-tools`:
```bash
# Debian/Ubuntu
sudo apt-get install aubio-tools

# Fedora
sudo dnf install aubio-tools

# Arch
sudo pacman -S aubio
```

BPM detection works out of the box on Windows and macOS.

## 🛠️ Development

### Project Structure
```
.
├── src/                    # React frontend
│   ├── components/        # Reusable React components
│   ├── pages/            # Page-level components
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility function
│   ├── types/            # TypeScript definitions
│   └── lib/              # Shared libraries
├── src-tauri/            # Tauri desktop app
│   ├── src/              # Rust backend code
│   ├── icons/            # App icons
│   └── Cargo.toml        # Rust dependencies
├── e2e/                  # Playwright end-to-end tests
├── docs/                 # Documentation
├── scripts/              # Build and utility scripts
└── public/               # Static assets
```

### Available Commands
```bash
# Development
npm run dev              # Start Vite dev server
npm run tauri dev        # Run desktop app with hot reload

# Building
npm run build            # Build web version
npm run tauri build      # Build desktop app (production)
npm run build:dev        # Build with dev settings

# Testing
npm run test:e2e         # Run Playwright tests
npm run test:e2e:ui      # Run tests with UI
npm run test:e2e:headed  # Run tests in headed mode
npm run test:tauri       # Run tests with Tauri backend
npm run test:all         # Lint + run all E2E tests

# Code Quality
npm run lint             # Run ESLint
npm run test:report      # View Playwright test report
```

### Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Desktop**: Tauri 2
- **Backend**: Rust (audio analysis, file operations)
- **UI Components**: Radix UI + shadcn/ui
- **Testing**: Playwright
- **Build**: Vite + Tauri CLI

### Audio Analysis

#### BPM Detection
Located in `src-tauri/src/bpm_detection.rs`:
- Uses aubio's beat tracking algorithm
- Supports various audio formats via ffmpeg
- Returns confidence scores

#### Key Detection  
Located in `src-tauri/src/key_detection.rs`:
- Chromatic pitch distribution analysis
- Confidence scoring for accuracy
- Best for tonal/melodic samples

See [docs/](docs/) for detailed architecture notes.

## 🤝 Contributing

We'd love your contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Suggesting features
- Setting up your development environment
- Submitting pull requests
- Code style and conventions

### Code of Conduct
Please read our [Code of Conduct](CODE_OF_CONDUCT.md) to understand our community standards.

## 📝 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons by [Lucide](https://lucide.dev/)
- Audio analysis powered by [aubio](https://aubio.org/)
- Testing with [Playwright](https://playwright.dev/)

## 📚 Documentation

- [Quick Start Guide](docs/QUICK_START_UPDATES.md)
- [Testing Guide](docs/TESTING_GUIDE.md)
- [App Behavior Guide](docs/APP_BEHAVIOR.md)
- [Release Guide](docs/RELEASE_GUIDE.md)

## 🐛 Found a Bug?

Please [open an issue](https://github.com/gerigazda0/clean-track-buddy/issues) with:
- Clear description of the problem
- Steps to reproduce
- Screenshots/logs if applicable
- Your environment (OS, version)

## 💡 Feature Requests

We welcome suggestions! [Open an issue](https://github.com/gerigazda0/clean-track-buddy/issues) and tag it with `enhancement`.

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/gerigazda0/clean-track-buddy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gerigazda0/clean-track-buddy/discussions)
- **Security**: See [SECURITY.md](SECURITY.md) for reporting security vulnerabilities

---

**Made with ❤️ for audio enthusiasts and producers**
