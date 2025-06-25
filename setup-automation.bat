@echo off
echo 🚀 Setting up Automated Deployment System
echo ==========================================
echo.

echo 📋 Step 1: GitHub CLI Authentication
echo Please authenticate with GitHub to enable automated secret management
echo.
pause
echo.

echo 🔐 Opening GitHub authentication...
start "" "https://github.com/login/device"
echo.
echo After the browser opens:
echo 1. Sign in to GitHub
echo 2. Enter the device code when prompted
echo 3. Authorize GitHub CLI
echo.

gh auth login --web
if %errorlevel% neq 0 (
    echo ❌ GitHub authentication failed
    echo Please restart PowerShell and try again
    pause
    exit /b 1
)

echo ✅ GitHub CLI authenticated successfully!
echo.

echo 📦 Step 2: Verify setup
node -e "console.log('✅ Node.js is working')"
npm --version >nul && echo ✅ npm is working
ngrok version >nul && echo ✅ ngrok is working || echo ⚠️  ngrok not found - install with: npm install -g ngrok

echo.
echo 🎯 Setup Complete!
echo ==================
echo.
echo 💡 Usage:
echo   npm run startbackend  - Start backend + ngrok tunnel
echo   npm run githubpublish - Commit and deploy to GitHub Pages
echo.
echo 🌟 Your automated deployment system is ready!
pause 