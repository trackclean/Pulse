# Contributing to Pulse

We welcome contributions! This document provides guidelines and instructions for contributing to the Pulse project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check the existing issues list to avoid duplicates.

When reporting a bug, include:
- **Clear description** of what the bug is
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment** (OS, version, etc.)
- **Logs or error messages** from the console

### Suggesting Features

We encourage feature suggestions! Please:
1. Check if the feature has already been suggested
2. Provide a clear description of the proposed feature
3. Explain the use case and why it would be helpful
4. Include any relevant examples or mockups

### Code Contributions

#### Setup

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/trackclean/Pulse.git
   cd Pulse
   ```
3. **Create a branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Start development for the desktop app**:
   ```bash
   npm run tauri dev
   ```
   This automatically uses the app build configuration and serves the Tauri app (not the website).

   To develop just the website:
   ```bash
   npm run dev
   ```

#### Development Workflow

- **Code Style**: Follow the existing code style and patterns in the project
- **TypeScript**: Use TypeScript for type safety (avoid `any` where possible)
- **Components**: Keep React components focused and reusable
- **Testing**: Add tests for new features and bugfixes
  ```bash
  npm run test:e2e        # Run end-to-end tests (headless)
  npm run test:e2e:ui     # Run tests with interactive UI
  npm run test:e2e:debug  # Debug tests step-by-step
  npm run lint            # Check for linting issues
  ```
- **Documentation**: Update README.md or docs/ if your change affects user-facing features

#### Commits

- Write clear, descriptive commit messages
- Use present tense ("add feature" not "added feature")
- Reference issues when relevant: "Fix #123"
- Keep commits focused and atomic (one feature/fix per commit)

Example:
```
Fix key selector overflow issue (#456)

- Replace Select component with KeyTreeSelector
- Organize keys into Major/Minor groups
```

#### Pull Requests

1. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. **Open a PR** on GitHub with a clear title and description
3. **Link** related issues (e.g., "Closes #123")
4. **Include** screenshots or gifs for UI changes
5. **Wait for review** - maintainers will provide feedback
6. **Make changes** if requested and push updates (the PR will auto-update)

### Project Structure

```
.
├── src/                      # Frontend source
│   ├── components/          # React components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript types
│   └── lib/                # Shared libraries
├── src-tauri/              # Desktop app (Tauri)
│   ├── src/                # Rust backend
│   └── Cargo.toml         # Rust dependencies
├── e2e/                    # End-to-end tests (Playwright)
├── docs/                   # Documentation
├── scripts/                # Build and utility scripts
└── public/                 # Static assets
```

### Key Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Desktop**: Tauri 2
- **Backend**: Rust (file operations, audio analysis)
- **UI Components**: Radix UI
- **Testing**: Playwright
- **Linting**: ESLint

## Development Tips

### Running the Desktop App

```bash
npm run tauri dev      # Run desktop app in dev mode with hot reload
npm run tauri build    # Build production installer (EXE on Windows, DMG on macOS, AppImage on Linux)
npm run test:tauri     # Run e2e tests against Tauri app
```

### Key Features by Module

- **Audio Analysis** (`src-tauri/src/`):
  - Musical key detection (`key_detection.rs`)
  
- **UI Components** (`src/components/`):
  - Audio file management (`AudioFileCard.tsx`)
  - Category rules (`CategoryManager.tsx`)
  - Settings/preferences (`SettingsDialog.tsx`)
  - Key selector (`KeyTreeSelector.tsx`)

- **Storage**: Uses localStorage for user settings and categories

### Debugging

- **Browser DevTools**: `Ctrl+Shift+I` in web version
- **Tauri DevTools**: Enable in `src-tauri/tauri.conf.json`
- **Console Logs**: Check browser console and Tauri logs

## Questions?

- Check [existing issues](https://github.com/trackclean/Pulse/issues)
- Start a [discussion](https://github.com/trackclean/Pulse/discussions)
- Review the [docs/](docs/) folder

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make Pulse better! 🎵
