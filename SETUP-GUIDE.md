# 🚀 GitHub Setup Guide for Automation

## Option 1: Automated Setup (Recommended)

**Run this one command and follow the prompts:**

```bash
node setup-github.js
```

This script will automatically:
- ✅ Install GitHub CLI (if needed)
- ✅ Authenticate with GitHub
- ✅ Create your repository
- ✅ Set up GitHub Pages
- ✅ Configure all URLs
- ✅ Push your code

## Option 2: Manual Setup (If automated fails)

### Step 1: Install GitHub CLI

```bash
winget install --id GitHub.cli
```

**Then restart PowerShell**

### Step 2: Authenticate with GitHub

```bash
gh auth login --web
```

Follow the browser prompts to sign in.

### Step 3: Create GitHub Repository

**Option A: Let GitHub CLI create it**
```bash
gh repo create car-app --public --description "Car Trading App"
```

**Option B: Create manually**
1. Go to https://github.com/new
2. Repository name: `car-app`
3. Make it **Public**
4. Click "Create repository"

### Step 4: Connect Your Local Code

```bash
# Initialize git (if not done)
git init

# Add GitHub as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/car-app.git

# Add all files and commit
git add .
git commit -m "Initial commit: Car Trading App"

# Push to GitHub
git push -u origin main
```

### Step 5: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select:
   - **Deploy from a branch**
   - Branch: **gh-pages**
   - Folder: **/ (root)**
5. Click **Save**

### Step 6: Update Your URLs

Update `package.json` homepage:
```json
{
  "homepage": "https://YOUR_USERNAME.github.io/car-app"
}
```

Commit and push:
```bash
git add package.json
git commit -m "Update homepage URL"
git push
```

## ✅ Verification

Run this to check everything is working:

```bash
# Check GitHub CLI
gh auth status

# Check your repository
gh repo view

# Check if ngrok is installed
ngrok version
```

## 🎯 Your URLs After Setup

- **Live Website:** `https://YOUR_USERNAME.github.io/car-app`
- **GitHub Repository:** `https://github.com/YOUR_USERNAME/car-app`
- **GitHub Actions:** `https://github.com/YOUR_USERNAME/car-app/actions`

## 🚀 Ready to Use!

Once setup is complete, you can use:

```bash
# Start backend + ngrok
npm run startbackend

# Deploy to live website
npm run githubpublish
```

## 🛠️ Troubleshooting

### GitHub CLI Issues
```bash
# Reinstall GitHub CLI
winget uninstall --id GitHub.cli
winget install --id GitHub.cli

# Restart PowerShell and authenticate again
gh auth login --web
```

### Repository Issues
```bash
# Check current remote
git remote -v

# Remove and re-add remote
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/car-app.git
```

### GitHub Pages Not Working
1. Check repository is **public**
2. Make sure **gh-pages** branch exists (created after first deployment)
3. Wait 5-10 minutes after first deployment
4. Check GitHub Actions tab for build status

## 💡 Pro Tips

- **Repository name** becomes part of your URL: `github.io/REPO-NAME`
- **GitHub Pages** takes 2-5 minutes to update after each deployment
- **GitHub Actions** tab shows build progress and errors
- **ngrok URL** changes each time you restart (free plan) 