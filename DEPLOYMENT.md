# 🚀 Archie Vault Deployment Guide

## Prerequisites

1. **GitHub Account** (Archietech1228)
2. **GitHub Personal Access Token** with these scopes:
   - `repo` (full control of private repositories)
   - `workflow` (optional, for future automation)
3. **Private repo created:** `VAULT-ARCHIETECH` (for encrypted data storage)
4. **GitHub Pages repo:** `Archietech1228.github.io` (for hosting the app)

---

## Step 1: Create Your Private Storage Repo

If you haven't already:

```bash
# Go to github.com/new
# Name: VAULT-ARCHIETECH
# Visibility: Private
# Initialize with README: Yes
```

---

## Step 2: Deploy the Vault App

### Option A: Using Git (Recommended)

```bash
# Navigate to your project folder
cd /Users/josph/Desktop/Vault_Planning/archie-vault

# Initialize git repo
git init

# Add all files
git add .

# Commit
git commit -m "🔐 Deploy Archie Vault v1.0"

# Add remote (replace with your pages repo URL)
git remote add origin https://github.com/Archietech1228/Archietech1228.github.io.git

# Push to main branch
git push -u origin main
```

### Option B: Manual Upload

1. Go to your GitHub Pages repo: `https://github.com/Archietech1228/Archietech1228.github.io`
2. Click **"Add file"** → **"Upload files"**
3. Drag and drop all files from `archie-vault/` folder
4. Commit changes

---

## Step 3: Enable GitHub Pages

1. Go to your Pages repo **Settings**
2. Navigate to **Pages** (left sidebar)
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**
5. Wait ~1-2 minutes for deployment

---

## Step 4: Access Your Vault

Your vault will be live at:
```
https://archietech1228.github.io
```

---

## Step 5: First-Time Setup

1. **Open the vault URL** on your device
2. **Enter your GitHub Personal Access Token** (this verifies GitHub access)
3. **Create a Vault Password** (this encrypts all your data - NEVER share or lose it!)
4. **Optional:** Check "Remember Token" on trusted devices
5. Click **Initialize Vault**

---

## 📱 Install as PWA (Phone/Desktop)

### On iPhone/iPad:
1. Open Safari → go to your vault URL
2. Tap the **Share** button (square with arrow)
3. Scroll down → **Add to Home Screen**
4. Name it "Archie Vault" → **Add**

### On Android:
1. Open Chrome → go to your vault URL
2. Tap the **3-dot menu** (top right)
3. Tap **"Install app"** or **"Add to Home Screen"**

### On Desktop (Chrome/Edge):
1. Open the vault URL
2. Click the **install icon** in the address bar (or 3-dot menu → Install)
3. Click **Install**

---

## 🔐 Security Notes

- ⚠️ **Vault Password is UNRECOVERABLE** - If lost, your data cannot be decrypted
- ✅ GitHub only sees encrypted binary blobs - zero-knowledge architecture
- ✅ All encryption happens client-side in your browser
- ✅ Token can be stored locally (encrypted) for convenience
- ✅ Use a strong, unique vault password

---

## 📁 Project Structure

```
archie-vault/
├── index.html          # Main app HTML
├── manifest.json       # PWA manifest
├── sw.js              # Service worker for offline
├── css/
│   └── app.css        # All styles
├── js/
│   ├── crypto.js      # Encryption engine
│   ├── github.js      # GitHub API wrapper
│   ├── storage.js     # Vault storage manager
│   ├── auth.js        # Authentication
│   ├── app.js         # Main app controller
│   └── ui/
│       ├── components.js      # UI utilities
│       ├── file-manager.js    # File vault
│       ├── password-manager.js # Password manager
│       ├── token-vault.js     # API tokens
│       ├── ideas-lab.js       # Ideas/notes
│       ├── media-vault.js     # Media files
│       └── clipboard.js       # Snippets
└── icons/
    ├── icon-192.svg   # PWA icon
    └── icon-512.svg   # PWA icon large
```

---

## 🔧 Customization

### Change Theme Colors
Edit `css/app.css` and modify the `:root` CSS variables:

```css
:root {
    --vault-bg: #0f0f12;
    --vault-card: #1a1a2e;
    --vault-primary: #00d9ff;
    /* ... */
}
```

### Add More Storage Categories
1. Add new section in `index.html`
2. Create new UI handler in `js/ui/`
3. Add storage methods in `js/storage.js`

---

## ❓ Troubleshooting

### "Token verification failed"
- Check your GitHub token has `repo` scope
- Make sure the token hasn't expired
- Verify the private repo `VAULT-ARCHIETECH` exists

### "Decryption failed"
- You're using the wrong vault password
- The encrypted data was corrupted
- Try re-initializing (⚠️ this will create a new vault)

### PWA not installing
- Make sure you're using HTTPS (GitHub Pages provides this)
- Clear browser cache and reload
- Check manifest.json is loading (DevTools → Application → Manifest)

---

## 🎉 You're All Set!

Your personal encrypted vault is now live. Enjoy secure, private storage powered by GitHub!

**Remember:** Your vault password is the key to everything. Store it safely!
