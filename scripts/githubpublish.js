#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
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

async function checkGitStatus() {
  try {
    const status = await execPromise('git status --porcelain');
    return status.length > 0;
  } catch (error) {
    throw new Error('Not a git repository or git not installed');
  }
}

async function getCurrentBranch() {
  try {
    return await execPromise('git branch --show-current');
  } catch (error) {
    return 'main';
  }
}

async function getCommitMessage() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args.join(' ');
  }
  
  // Generate automatic commit message based on changes
  try {
    const diff = await execPromise('git diff --name-only --cached');
    const modified = await execPromise('git diff --name-only');
    const untracked = await execPromise('git ls-files --others --exclude-standard');
    
    const allFiles = [...new Set([...diff.split('\n'), ...modified.split('\n'), ...untracked.split('\n')])].filter(f => f);
    
    if (allFiles.length === 0) {
      return 'Update application';
    }
    
    const hasComponents = allFiles.some(f => f.includes('components/'));
    const hasStyles = allFiles.some(f => f.includes('.css') || f.includes('.scss'));
    const hasBackend = allFiles.some(f => f.includes('backend/'));
    const hasConfig = allFiles.some(f => f.includes('package.json') || f.includes('.env') || f.includes('config'));
    
    if (hasComponents) return 'Update components and UI';
    if (hasStyles) return 'Update styling and design';
    if (hasBackend) return 'Update backend functionality';
    if (hasConfig) return 'Update configuration';
    
    return `Update ${allFiles.length} files`;
  } catch (error) {
    return 'Update application';
  }
}

async function updateNgrokUrl() {
  try {
    log('🔍 Checking for ngrok tunnel...', colors.blue);
    
    // Check if ngrok is running by hitting the API
    const ngrokResponse = await execPromise('curl -s http://localhost:4040/api/tunnels');
    const tunnels = JSON.parse(ngrokResponse);
    
    if (tunnels.tunnels && tunnels.tunnels.length > 0) {
      const httpsTunnel = tunnels.tunnels.find(t => t.proto === 'https');
      if (httpsTunnel) {
        const ngrokUrl = httpsTunnel.public_url;
        log(`✅ Found ngrok URL: ${ngrokUrl}`, colors.green);
        
                 // Update GitHub secret via GitHub CLI
         try {
           await execPromise(`gh secret set REACT_APP_API_URL --body "${ngrokUrl}"`);
           log('✅ Updated GitHub secret with ngrok URL', colors.green);
           return true;
         } catch (error) {
           // Try to fix PATH issue and retry
           try {
             const fs = require('fs');
             if (fs.existsSync('C:\\Program Files\\GitHub CLI\\gh.exe')) {
               log('🔧 GitHub CLI found, adding to PATH...', colors.yellow);
               process.env.PATH += ';C:\\Program Files\\GitHub CLI';
               await execPromise(`gh secret set REACT_APP_API_URL --body "${ngrokUrl}"`);
               log('✅ Updated GitHub secret with ngrok URL', colors.green);
               return true;
             } else {
               throw new Error('GitHub CLI not found');
             }
           } catch (retryError) {
             log('⚠️  Could not update GitHub secret automatically', colors.yellow);
             log('   Make sure GitHub CLI is installed and authenticated', colors.yellow);
             log(`   Manual update needed: REACT_APP_API_URL = ${ngrokUrl}`, colors.yellow);
             return false;
           }
         }
      }
    }
    
    log('⚠️  No ngrok tunnel found', colors.yellow);
    log('   Start backend first: npm run startbackend', colors.yellow);
    return false;
  } catch (error) {
    log('⚠️  Could not check ngrok status', colors.yellow);
    return false;
  }
}

async function main() {
  try {
    log('🚀 GitHub Publish - Automated Deployment', colors.blue);
    log('=========================================', colors.blue);
    
    // Check if we're in a git repository
    const hasChanges = await checkGitStatus();
    if (!hasChanges) {
      log('ℹ️  No changes detected', colors.yellow);
      log('   Nothing to commit and publish', colors.yellow);
      return;
    }
    
    // Update ngrok URL in GitHub secrets
    log('\n📡 Updating API URL...', colors.blue);
    await updateNgrokUrl();
    
    // Get current branch
    const branch = await getCurrentBranch();
    log(`\n📋 Working on branch: ${branch}`, colors.blue);
    
    // Stage all changes
    log('\n📦 Staging changes...', colors.blue);
    await execPromise('git add .');
    log('✅ All changes staged', colors.green);
    
    // Generate commit message
    const commitMessage = await getCommitMessage();
    log(`\n💬 Commit message: "${commitMessage}"`, colors.blue);
    
    // Commit changes
    log('\n📝 Committing changes...', colors.blue);
    await execPromise(`git commit -m "${commitMessage}"`);
    log('✅ Changes committed', colors.green);
    
    // Push to GitHub
    log(`\n🚀 Pushing to GitHub (${branch})...`, colors.blue);
    await execPromise(`git push origin ${branch}`);
    log('✅ Successfully pushed to GitHub', colors.green);
    
    // Get repository info for URL
    try {
      const remoteUrl = await execPromise('git config --get remote.origin.url');
      const repoMatch = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
      if (repoMatch) {
        const repoPath = repoMatch[1];
        log(`\n🌐 GitHub Repository: https://github.com/${repoPath}`, colors.blue);
        log(`📊 Actions: https://github.com/${repoPath}/actions`, colors.blue);
        
        // Try to get username for GitHub Pages URL
        const username = repoPath.split('/')[0];
        log(`🌍 Live Site: https://${username}.github.io/car-app`, colors.green);
      }
    } catch (error) {
      // Ignore error, just won't show URLs
    }
    
    log('\n✨ Deployment initiated!', colors.green);
    log('⏱️  GitHub Pages will update in 2-5 minutes', colors.yellow);
    log('📱 Check GitHub Actions for build status', colors.blue);
    
  } catch (error) {
    log('\n❌ Error during publish:', colors.red);
    if (error.stderr) {
      log(error.stderr, colors.red);
    } else {
      log(error.message || error, colors.red);
    }
    process.exit(1);
  }
}

main(); 