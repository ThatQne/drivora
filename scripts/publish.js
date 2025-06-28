#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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

async function runCommand(command, errorMessage) {
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) log(stdout);
    if (stderr) log(stderr, colors.yellow);
    return true;
  } catch (error) {
    log(`❌ ${errorMessage}`, colors.red);
    log(error.message, colors.red);
    return false;
  }
}

async function main() {
  try {
    log('🚀 Starting publish process...', colors.blue);

    // Check for changes
    const { stdout: status } = await execAsync('git status --porcelain');
    if (status) {
      log('📦 Changes detected, committing...', colors.blue);
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // Add and commit changes
      await runCommand('git add .', 'Failed to stage changes');
      await runCommand(`git commit -m "Update: ${timestamp}"`, 'Failed to commit changes');
      
      // Push changes
      log('📤 Pushing changes to GitHub...', colors.blue);
      await runCommand('git push', 'Failed to push changes');
    } else {
      log('✅ No changes to commit', colors.green);
    }

    // Build and deploy to GitHub Pages
    log('🚀 Deploying to GitHub Pages...', colors.blue);
    await runCommand('npm run build', 'Failed to build the project');
    await runCommand('npx gh-pages -d build --git git', 'Failed to deploy to GitHub Pages');

    log('✅ Successfully published!', colors.green);
    log('🌎 Your site will be available at: https://ThatQne.github.io/drivora', colors.green);
  } catch (error) {
    log('❌ Publish process failed', colors.red);
    log(error.message, colors.red);
    process.exit(1);
  }
}

main(); 