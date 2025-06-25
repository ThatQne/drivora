# 🚀 Automated Deployment System

## Two Simple Commands

### 1. `npm run startbackend`
**Starts your backend and automatically sets up everything:**
- ✅ Starts backend server on port 5000
- ✅ Creates ngrok tunnel automatically  
- ✅ Updates .env with ngrok URL
- ✅ Updates GitHub secret with ngrok URL
- ✅ Shows you all the URLs you need

### 2. `npm run githubpublish`
**Commits your changes and deploys to live website:**
- ✅ Automatically commits all changes
- ✅ Generates smart commit messages
- ✅ Updates GitHub with latest ngrok URL
- ✅ Pushes to GitHub (triggers automatic deployment)
- ✅ Shows you live website URL

## 📋 First-Time Setup

1. **Run setup script:**
   ```bash
   setup-automation.bat
   ```

2. **Authenticate with GitHub** when prompted

3. **You're ready!** 🎉

## 🔄 Daily Workflow

```bash
# 1. Start your backend (one command)
npm run startbackend

# 2. Make your changes to the frontend
# Edit files, add features, etc.

# 3. Deploy to live website (one command)  
npm run githubpublish

# 4. Your live site updates automatically in 2-5 minutes! ✨
```

## 🌐 URLs You'll Get

- **Local Backend:** http://localhost:5000
- **ngrok Tunnel:** https://abc123.ngrok.io (changes each restart)
- **ngrok Dashboard:** http://localhost:4040
- **Live Website:** https://thatqne.github.io/car-app
- **GitHub Actions:** https://github.com/thatqne/car-app/actions

## 💡 Features

### Smart Commit Messages
The system automatically generates commit messages based on what you changed:
- "Update components and UI" - when you modify components
- "Update styling and design" - when you change CSS files
- "Update backend functionality" - when you modify backend
- Or you can specify your own: `npm run githubpublish "My custom message"`

### Automatic Environment Management
- Updates local `.env` file with ngrok URL
- Updates GitHub secrets for deployment
- No manual copy-pasting of URLs needed

### Process Management
- Automatically kills existing backend/ngrok processes
- Handles port conflicts
- Graceful shutdown with Ctrl+C

## 🛠️ Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is busy
netstat -ano | findstr :5000

# Kill the process manually
taskkill /F /PID [PID_NUMBER]
```

### GitHub authentication issues
```bash
# Re-authenticate
gh auth login --web

# Check status
gh auth status
```

### ngrok issues
```bash
# Reinstall ngrok
npm install -g ngrok

# Check if it's running
curl http://localhost:4040/api/tunnels
```

## 🎯 What Happens When You Deploy

1. **startbackend** runs → Backend starts → ngrok creates tunnel → URLs updated everywhere
2. **githubpublish** runs → Changes committed → Pushed to GitHub → GitHub Actions builds → Live site updates

**Total time:** ~3-5 minutes from code change to live website! 🚀 