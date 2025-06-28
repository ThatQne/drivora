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

    // Check if there are any changes to commit
    const { stdout: status } = await execAsync('git status --porcelain');
    if (status) {
      // Changes exist, commit them
      log('📦 Changes detected, committing...', colors.blue);
      
      // Add all changes
      if (!await runCommand('git add .', 'Failed to stage changes')) {
        process.exit(1);
      }

      // Get the current date for the commit message
      const date = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Commit changes
      if (!await runCommand(
        `git commit -m "Update: ${date}"`,
        'Failed to commit changes'
      )) {
        process.exit(1);
      }

      // Push to main branch
      log('📤 Pushing changes to GitHub...', colors.blue);
      if (!await runCommand('git push origin main', 'Failed to push changes')) {
        process.exit(1);
      }
    } else {
      log('✅ No changes to commit', colors.green);
    }

    // Deploy to GitHub Pages
    log('🚀 Deploying to GitHub Pages...', colors.blue);
    if (!await runCommand('npm run deploy', 'Failed to deploy to GitHub Pages')) {
      process.exit(1);
    }

    log('✅ Successfully published and deployed!', colors.green);
    log('🌐 Your site will be available at: https://thatqne.github.io/drivora', colors.blue);

  } catch (error) {
    log('❌ Publish process failed:', colors.red);
    log(error.message, colors.red);
    process.exit(1);
  }
}

main(); 