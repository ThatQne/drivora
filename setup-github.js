#!/usr/bin/env node

const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function checkGitHubCLI() {
  try {
    await execPromise('gh --version');
    log('✅ GitHub CLI is installed', colors.green);
    return true;
  } catch (error) {
    // Check if it's installed but not in PATH
    try {
      const fs = require('fs');
      if (fs.existsSync('C:\\Program Files\\GitHub CLI\\gh.exe')) {
        log('🔧 GitHub CLI found, adding to PATH...', colors.yellow);
        process.env.PATH += ';C:\\Program Files\\GitHub CLI';
        await execPromise('gh --version');
        log('✅ GitHub CLI is now working', colors.green);
        return true;
      }
    } catch (pathError) {
      // Still not working
    }
    
    log('❌ GitHub CLI not found', colors.red);
    log('Installing GitHub CLI...', colors.blue);
    try {
      await execPromise('winget install --id GitHub.cli');
      log('✅ GitHub CLI installed! Please restart PowerShell and run this script again.', colors.green);
      return false;
    } catch (installError) {
      log('❌ Could not install GitHub CLI automatically', colors.red);
      log('Please install manually: https://cli.github.com/', colors.yellow);
      return false;
    }
  }
}

async function authenticateGitHub() {
  try {
    await execPromise('gh auth status');
    log('✅ Already authenticated with GitHub', colors.green);
    return true;
  } catch (error) {
    log('🔐 Need to authenticate with GitHub...', colors.blue);
    log('Opening browser for authentication...', colors.yellow);
    
    try {
      await execPromise('gh auth login --web');
      log('✅ Successfully authenticated with GitHub!', colors.green);
      return true;
    } catch (authError) {
      log('❌ Authentication failed', colors.red);
      log('Please try: gh auth login --web', colors.yellow);
      return false;
    }
  }
}

async function setupGitRepository() {
  log('\n📁 Setting up Git repository...', colors.blue);
  
  // Check if already a git repo
  try {
    await execPromise('git status');
    log('✅ Already a Git repository', colors.green);
  } catch (error) {
    log('Initializing Git repository...', colors.yellow);
    await execPromise('git init');
    log('✅ Git repository initialized', colors.green);
  }
  
  // Check if remote exists
  try {
    const remoteUrl = await execPromise('git config --get remote.origin.url');
    if (remoteUrl.includes('github.com')) {
      log(`✅ GitHub remote already configured: ${remoteUrl}`, colors.green);
      return remoteUrl;
    }
  } catch (error) {
    // No remote exists, need to create one
  }
  
  // Get repository name
  const repoName = await askQuestion('Enter repository name (default: car-app): ') || 'car-app';
  
  log(`\n🚀 Creating GitHub repository: ${repoName}`, colors.blue);
  
  try {
    // Create GitHub repository
    await execPromise(`gh repo create ${repoName} --public --description "Car Trading App" --confirm`);
    log('✅ GitHub repository created!', colors.green);
    
    // Add remote
    const username = await execPromise('gh api user --jq .login');
    const repoUrl = `https://github.com/${username}/${repoName}.git`;
    
    await execPromise(`git remote add origin ${repoUrl}`);
    log(`✅ Remote added: ${repoUrl}`, colors.green);
    
    return repoUrl;
  } catch (error) {
    log('❌ Could not create repository automatically', colors.red);
    log('Please create manually at: https://github.com/new', colors.yellow);
    
    const manualUrl = await askQuestion('Enter your GitHub repository URL: ');
    await execPromise(`git remote add origin ${manualUrl}`);
    return manualUrl;
  }
}

async function commitAndPushInitial() {
  log('\n📦 Committing and pushing initial code...', colors.blue);
  
  try {
    // Add all files
    await execPromise('git add .');
    
    // Check if there are changes to commit
    try {
      await execPromise('git diff --cached --exit-code');
      log('ℹ️  No changes to commit', colors.yellow);
    } catch (error) {
      // There are changes, commit them
      await execPromise('git commit -m "Initial commit: Car Trading App with automated deployment"');
      log('✅ Initial commit created', colors.green);
      
      // Push to GitHub
      await execPromise('git push -u origin main');
      log('✅ Code pushed to GitHub!', colors.green);
    }
  } catch (error) {
    log('⚠️  Could not push automatically', colors.yellow);
    log('You may need to push manually later', colors.yellow);
  }
}

async function setupGitHubPages(repoUrl) {
  log('\n🌐 Setting up GitHub Pages...', colors.blue);
  
  try {
    // Extract owner/repo from URL
    const match = repoUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
    if (!match) {
      throw new Error('Could not parse repository URL');
    }
    
    const repoPath = match[1];
    
    // Enable GitHub Pages
    await execPromise(`gh api repos/${repoPath} --method PATCH --field has_pages=true`);
    
    // Configure Pages to use gh-pages branch
    await execPromise(`gh api repos/${repoPath}/pages --method POST --field source.branch=gh-pages --field source.path=/`);
    
    log('✅ GitHub Pages enabled!', colors.green);
    
    const username = repoPath.split('/')[0];
    const repoName = repoPath.split('/')[1];
    const pagesUrl = `https://${username}.github.io/${repoName}`;
    
    log(`🌍 Your website will be available at: ${pagesUrl}`, colors.cyan);
    
    return pagesUrl;
  } catch (error) {
    log('⚠️  Could not configure GitHub Pages automatically', colors.yellow);
    log('Please configure manually:', colors.yellow);
    log('1. Go to your GitHub repository', colors.yellow);
    log('2. Settings → Pages', colors.yellow);
    log('3. Source: "Deploy from a branch"', colors.yellow);
    log('4. Branch: gh-pages', colors.yellow);
    
    const repoPath = repoUrl.match(/github\.com[:/](.+?)(?:\.git)?$/)?.[1];
    if (repoPath) {
      const username = repoPath.split('/')[0];
      const repoName = repoPath.split('/')[1];
      return `https://${username}.github.io/${repoName}`;
    }
    return null;
  }
}

async function updatePackageJson(pagesUrl) {
  if (!pagesUrl) return;
  
  log('\n📝 Updating package.json with correct homepage...', colors.blue);
  
  try {
    const fs = require('fs');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    packageJson.homepage = pagesUrl;
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    log(`✅ Homepage updated to: ${pagesUrl}`, colors.green);
    
    // Commit the change
    await execPromise('git add package.json');
    await execPromise('git commit -m "Update homepage URL for GitHub Pages"');
    await execPromise('git push');
    log('✅ Changes pushed to GitHub', colors.green);
  } catch (error) {
    log('⚠️  Could not update package.json automatically', colors.yellow);
  }
}

async function testSetup(pagesUrl) {
  log('\n🧪 Testing automation setup...', colors.blue);
  
  // Test GitHub CLI
  try {
    await execPromise('gh auth status');
    log('✅ GitHub CLI authenticated', colors.green);
  } catch (error) {
    log('❌ GitHub CLI authentication issue', colors.red);
    return false;
  }
  
  // Test ngrok
  try {
    await execPromise('ngrok version');
    log('✅ ngrok is installed', colors.green);
  } catch (error) {
    log('❌ ngrok not found', colors.red);
    log('Install with: npm install -g ngrok', colors.yellow);
    return false;
  }
  
  return true;
}

async function main() {
  try {
    log('🚀 GitHub Setup for Automated Deployment', colors.blue);
    log('=========================================', colors.blue);
    
    // Step 1: Check GitHub CLI
    log('\n1️⃣  Checking GitHub CLI...', colors.blue);
    const hasGitHubCLI = await checkGitHubCLI();
    if (!hasGitHubCLI) {
      log('\n❌ Please restart PowerShell and run this script again', colors.red);
      rl.close();
      return;
    }
    
    // Step 2: Authenticate
    log('\n2️⃣  Authenticating with GitHub...', colors.blue);
    const isAuthenticated = await authenticateGitHub();
    if (!isAuthenticated) {
      rl.close();
      return;
    }
    
    // Step 3: Setup Git repository
    log('\n3️⃣  Setting up Git repository...', colors.blue);
    const repoUrl = await setupGitRepository();
    
    // Step 4: Commit and push initial code
    log('\n4️⃣  Pushing code to GitHub...', colors.blue);
    await commitAndPushInitial();
    
    // Step 5: Setup GitHub Pages
    log('\n5️⃣  Configuring GitHub Pages...', colors.blue);
    const pagesUrl = await setupGitHubPages(repoUrl);
    
    // Step 6: Update package.json
    log('\n6️⃣  Updating configuration...', colors.blue);
    await updatePackageJson(pagesUrl);
    
    // Step 7: Test setup
    log('\n7️⃣  Testing setup...', colors.blue);
    const setupOk = await testSetup(pagesUrl);
    
    // Final summary
    log('\n' + '='.repeat(50), colors.blue);
    
    if (setupOk && pagesUrl) {
      log('🎉 Setup Complete! Your automation system is ready!', colors.green);
      log('\n🌐 Your URLs:', colors.blue);
      log(`📱 Live Website: ${pagesUrl}`, colors.cyan);
      log(`📊 GitHub Repo: ${repoUrl}`, colors.cyan);
      log(`🔧 GitHub Actions: ${repoUrl.replace('.git', '')}/actions`, colors.cyan);
      
      log('\n💡 Next Steps:', colors.yellow);
      log('1. npm run startbackend  - Start your backend', colors.green);
      log('2. npm run githubpublish - Deploy to live website', colors.green);
      
      log('\n🚀 Your website will be live in 2-5 minutes after first deployment!', colors.blue);
    } else {
      log('⚠️  Setup completed with some issues', colors.yellow);
      log('Please check the messages above and fix any remaining issues', colors.yellow);
    }
    
  } catch (error) {
    log('\n❌ Setup failed:', colors.red);
    if (error.stderr) {
      log(error.stderr, colors.red);
    } else {
      log(error.message || error, colors.red);
    }
  }
  
  rl.close();
}

main(); 