# Clean Track Buddy - Landing Page Quick Start

Get the landing page set up and deployed in 5 minutes!

## 🚀 Quick Setup (5 Minutes)

### 1. Update Core Info (1 minute)

The site is already configured for Clean Track Buddy, but if you need to customize it:

**Edit `index.html`:**
- Update app name (if forked or customized)
- Modify feature descriptions
- Update download links to match your release URLs
- Change PayPal email if accepting donations

### 2. Update Donation Settings (1 minute)

Find the donation section in `index.html`:

```html
<input type="hidden" name="business" value="trackclean@example.com">
```

Replace with your PayPal email if needed.

For GitHub Sponsors:
```html
<a href="https://github.com/sponsors/trackclean" class="donate-button">
```

Replace `trackclean` with your GitHub username.

### 3. Deploy to GitHub Pages (1 minute)

1. Ensure your repository is public
2. Go to **Settings** → **Pages**
3. Select **Deploy from a branch**
4. Choose `main` branch and `/` (root folder)
5. Click **Save**

Your site will be live at: `https://trackclean.github.io/clean-track/`

(Adjust the URL based on your username and repo name)

### 4. Test Everything (2 minutes)

- [ ] Site loads correctly
- [ ] Download links work (point to actual releases)
- [ ] Donation buttons work
- [ ] Mobile view looks good
- [ ] All links in footer work

## 📝 File Reference

- `index.html` - Main landing page (update content here)
- `style.css` - Colors and styling
- `script.js` - Interactive features
- `.github/workflows/pages.yml` - Auto-deployment config

## 🎨 Optional Customizations

### Colors

Edit `:root` variables in `style.css`:

```css
--primary-color: #0066cc;      /* Main blue */
--primary-dark: #0052a3;
--secondary-color: #28a745;    /* Buttons */
```

### Add Custom Domain

1. Edit or create `CNAME` file with your domain
2. Configure DNS settings with domain registrar
3. Update GitHub Pages settings to use custom domain

### Add Analytics

Paste Google Analytics code into the `<head>` of `index.html`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

## ✅ Deployment Checklist

Before launching:

- [ ] Site is deployed and accessible
- [ ] Download links point to real GitHub releases
- [ ] Donation buttons are functional
- [ ] Mobile view is responsive
- [ ] No broken links
- [ ] Features description matches your app
- [ ] Footer links point to correct repos/contacts

## 🎯 Common Updates

### Releasing a New Version

1. Create new release on GitHub with installer files
2. Update version number in `index.html` download section
3. Update download links to point to new release
4. Push changes—GitHub Pages rebuilds automatically

### Changing App Name

Use Find & Replace in `index.html`:
- Find: `Clean Track Buddy`
- Replace with: Your app name

## 📚 Resources

- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [Clean Track Buddy Repo](https://github.com/trackclean/clean-track)
- [Building with Tauri](https://tauri.app/)

---

**That's it!** Your Clean Track Buddy landing page is live. Enjoy! 🎵
