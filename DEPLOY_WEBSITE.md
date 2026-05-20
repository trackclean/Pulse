# Deploy Website to GitHub Pages - Step by Step

Get your Pulse landing page live on GitHub Pages in **5 minutes**.

---

## Step 1: Ensure Repository is Public (1 minute)

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. Scroll down to "Danger Zone"
4. Check the repository visibility — it must be **Public**
5. If Private, click **Change visibility** → Select **Public** → Confirm

✅ **Done** — Your repo is now public

---

## Step 2: Enable GitHub Pages (2 minutes)

1. In the same **Settings** tab, scroll down to **Pages** (left sidebar)
2. Under "Build and deployment":
   - **Source**: Select **GitHub Actions**
3. GitHub will auto-detect and show the workflow

✅ **Done** — GitHub Pages is enabled

---

## Step 3: Verify the Workflow File (1 minute)

The workflow is already configured. Just verify:

1. Go to **Actions** tab in your repo
2. Look for **"Deploy to GitHub Pages"** workflow
3. If you see recent runs (green checkmarks), it's working
4. If not, trigger it manually:
   - Click **"Deploy to GitHub Pages"** workflow
   - Click **Run workflow** → **Run workflow** button

✅ **Done** — Workflow is running

---

## Step 4: Get Your Live URL (1 minute)

Once the workflow completes (2-5 minutes):

1. Go to **Settings** → **Pages**
2. Look for the blue box at the top that says:
   ```
   Your site is live at https://[username].github.io/clean-track-buddy/
   ```
3. Click the link to view your website

✅ **Done** — Your website is live!

---

## Step 5: Verify Everything Works (Optional)

Check that:
- [ ] Landing page loads
- [ ] Navigation links scroll correctly
- [ ] Feature cards are visible
- [ ] Download/Try buttons are there
- [ ] Mobile view looks good
- [ ] No console errors (press F12, check Console tab)

---

## Troubleshooting

### Website shows 404 error?
- Wait 5-10 minutes for GitHub Pages to build and deploy
- Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check that the repository is **Public**
- Check **Actions** tab to see if workflow passed (green check)

### Workflow keeps failing?
- Go to **Actions** → **Deploy to GitHub Pages** → Click the failed run
- Scroll to the error in the logs
- Common fixes:
  - Make sure `node_modules/` is not in version control
  - Check that `package.json` exists in the root
  - Run `npm install` locally and test: `npm run build`

### Links or images not showing?
- This usually happens if paths are wrong
- The current `vite.config.ts` handles this automatically
- If issues persist, check browser console for 404 errors

---

## What Gets Deployed

Your website includes:
- ✅ **Landing page** (`index.html`)
- ✅ **Styling** (`style.css`)
- ✅ **Interactions** (`script.js`)
- ✅ **Screenshots** (`assets/screenshots/`)
- ✅ **App interface preview** (static, non-functional)

---

## Important Notes

**This is your marketing website, NOT the app itself:**
- Users can see screenshots and features
- Users can click "Try Online" and see the UI (but file uploads won't work)
- Users click "Download Free" to get the desktop app
- The desktop app is downloaded from GitHub Releases (separate)

---

## Next Steps

Once your website is live:

1. **Share the link** — `https://[username].github.io/clean-track-buddy/`
2. **Update GitHub README** — Add link to live site
3. **Create GitHub Releases** — Upload desktop binaries (.exe, .dmg, .AppImage)
4. **(Optional) Custom Domain** — Set up a custom domain name

---

## Custom Domain (Optional)

To use your own domain (e.g., `pulse.example.com`):

1. Update DNS records with your registrar (follow their guide)
2. Go to **Settings** → **Pages**
3. Under "Custom domain", enter your domain
4. GitHub will verify and set up HTTPS automatically

---

**That's it!** Your website is now live on GitHub Pages. 🚀
