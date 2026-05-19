# Security Policy

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability in Clean Track Buddy, please **do not** open a public GitHub issue. Instead, please report it responsibly.

### How to Report

1. **Email**: Send a detailed report to the maintainers (check the repository settings for contact info or open a private discussion)
2. **Details to include**:
   - Type of vulnerability (e.g., XSS, injection, privilege escalation)
   - Location in code (file, line number if possible)
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- Acknowledgment of your report within 48 hours
- Regular updates on progress
- Credit in the security advisory (if you wish)
- Responsible disclosure coordination

## Security Considerations

### Local Processing
- **All analysis runs locally** on your machine
- No audio files are uploaded to external servers
- Original files are never modified by the app

### Data Storage
- User settings and categories are stored in **browser localStorage** (web) or **local files** (desktop)
- No data is transmitted unless explicitly exporting

### Dependencies
- We regularly update dependencies to address known vulnerabilities
- Check the `package.json` and `Cargo.toml` for current versions
- Report any security issues with dependencies we may have missed

### File Operations
- Export creates new files; originals are never modified
- ZIP exports are created locally and not transmitted
- File paths are validated to prevent directory traversal attacks

## Best Practices for Users

1. **Keep the app updated** - Security patches are released regularly
2. **Verify downloads** - Always download from official [Releases](https://github.com/gerigazda0/clean-track-buddy/releases)
3. **Monitor dependencies** - For development, keep npm/Cargo dependencies updated
4. **Report suspicious behavior** - If you notice anything unusual, report it

## Supported Versions

Security updates are provided for:
- Current stable release
- Previous major version (limited support)

## Known Limitations

- The browser-based version has the same security constraints as any web app
- Desktop app runs with the user's file system permissions
- Key detection confidence scores are provided as-is; musical analysis is not guaranteed

---

**Thank you for helping keep Clean Track Buddy secure!**
