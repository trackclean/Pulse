# GitHub Pages Deployment - Quick Checklist

Copy this and follow through before deploying.

## Pre-Deployment Checklist ✓

- [ ] Repository is **Public** (Settings → General → Public)
- [ ] You have **main** branch (default)
- [ ] `index.html` exists in root directory
- [ ] `package.json` exists in root directory
- [ ] You can run `npm install` and `npm run build` locally

## Deployment Steps

### Step 1: Enable GitHub Actions
1. Go to your repo → **Settings** → **Pages**
2. Under "Build and deployment":
   - **Source**: Select **GitHub Actions** (not "Deploy from a branch")
3. Save

### Step 2: Trigger Deployment
Choose ONE:

**Option A - Automatic (Recommended)**
- Push any changes to `main` branch
- GitHub automatically builds and deploys

**Option B - Manual**
1. Go to **Actions** tab
2. Click **Deploy to GitHub Pages** on the left
3. Click **Run workflow** → **Run workflow**
4. Wait 2-5 minutes

### Step 3: View Your Site
1. Go to **Settings** → **Pages**
2. Look for the green box with your live URL
3. Click the link

---

## Your Live URL

Once deployed, your site will be at:
```
https://trackclean.github.io/Pulse/
```

(Replace `trackclean` with your GitHub username)

---

## If Something Goes Wrong

### Check the workflow logs:
1. **Actions** tab → **Deploy to GitHub Pages**
2. Click the latest run
3. Click **build** job
4. Look for red ✗ errors

### Common fixes:
- **Workflow stuck pending?** Go to **Actions** → click the workflow → **Run workflow** manually
- **404 error?** Wait 5 minutes and hard-refresh (Ctrl+Shift+R)
- **Images not showing?** Check browser console (F12) for 404s — usually fixed by vite config
- **Build fails?** Check that `node_modules/` is in `.gitignore`

---

## Disable Old Workflow (Optional but Recommended)

You have a second workflow (`static.yml`) that might conflict. Disable it:

1. Go to **.github/workflows/static.yml**
2. Delete the file or rename to `.static.yml`
3. Commit and push

This prevents confusing deployment conflicts.

---

**Next: Run the steps above, then share your live URL!** 🎉
