#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

async function checkPrerequisites() {
  const checks = [
    { name: 'Node.js', command: 'node --version' },
    { name: 'npm', command: 'npm --version' },
    { name: 'ngrok', command: 'ngrok version' }
  ];
  
  for (const check of checks) {
    try {
      await execPromise(check.command);
      log(`✅ ${check.name} is installed`, colors.green);
    } catch (error) {
      log(`❌ ${check.name} is not installed`, colors.red);
      if (check.name === 'ngrok') {
        log('   Install with: npm install -g ngrok', colors.yellow);
      }
      return false;
    }
  }
  return true;
}

async function checkBackendDependencies() {
  const backendPath = path.join(process.cwd(), 'backend');
  if (!fs.existsSync(path.join(backendPath, 'node_modules'))) {
    log('📦 Installing backend dependencies...', colors.blue);
    try {
      await execPromise('npm install', { cwd: backendPath });
      log('✅ Backend dependencies installed', colors.green);
    } catch (error) {
      log('❌ Failed to install backend dependencies', colors.red);
      return false;
    }
  }
  return true;
}

async function killExistingProcesses() {
  try {
    // Kill existing backend processes on port 5000
    if (process.platform === 'win32') {
      await execPromise('netstat -ano | findstr :5000').then(result => {
        const lines = result.split('\n');
        lines.forEach(line => {
          const match = line.match(/\s+(\d+)$/);
          if (match) {
            const pid = match[1];
            execPromise(`taskkill /F /PID ${pid}`).catch(() => {});
          }
        });
      }).catch(() => {});
    } else {
      await execPromise('lsof -ti:5000 | xargs kill -9').catch(() => {});
    }
    
    // Kill existing ngrok processes
    if (process.platform === 'win32') {
      await execPromise('taskkill /F /IM ngrok.exe').catch(() => {});
    } else {
      await execPromise('pkill -f ngrok').catch(() => {});
    }
    
    log('🧹 Cleaned up existing processes', colors.yellow);
  } catch (error) {
    // Ignore errors, processes might not exist
  }
}

function startBackendServer() {
  return new Promise((resolve, reject) => {
    log('🚀 Starting backend server...', colors.blue);
    
    const backendPath = path.join(process.cwd(), 'backend');
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: backendPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    let serverStarted = false;
    
    backend.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running') || output.includes('listening')) {
        if (!serverStarted) {
          serverStarted = true;
          log('✅ Backend server started on port 5000', colors.green);
          resolve(backend);
        }
      }
      // Log backend output with prefix
      output.split('\n').forEach(line => {
        if (line.trim()) {
          log(`[Backend] ${line.trim()}`, colors.cyan);
        }
      });
    });
    
    backend.stderr.on('data', (data) => {
      const output = data.toString();
      output.split('\n').forEach(line => {
        if (line.trim()) {
          log(`[Backend Error] ${line.trim()}`, colors.red);
        }
      });
    });
    
    backend.on('error', (error) => {
      reject(error);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!serverStarted) {
        reject(new Error('Backend server failed to start within 10 seconds'));
      }
    }, 10000);
  });
}

function startNgrokTunnel() {
  return new Promise((resolve, reject) => {
    log('🌐 Starting ngrok tunnel...', colors.blue);
    
    const ngrok = spawn('ngrok', ['http', '5000'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    let tunnelStarted = false;
    
    ngrok.stdout.on('data', (data) => {
      const output = data.toString();
      output.split('\n').forEach(line => {
        if (line.trim()) {
          log(`[ngrok] ${line.trim()}`, colors.cyan);
        }
      });
    });
    
    ngrok.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('started tunnel') || output.includes('url=https://')) {
        if (!tunnelStarted) {
          tunnelStarted = true;
          resolve(ngrok);
        }
      }
      output.split('\n').forEach(line => {
        if (line.trim()) {
          log(`[ngrok] ${line.trim()}`, colors.cyan);
        }
      });
    });
    
    ngrok.on('error', (error) => {
      reject(error);
    });
    
    // Timeout after 15 seconds
    setTimeout(() => {
      if (!tunnelStarted) {
        resolve(ngrok); // Continue even if we can't detect startup
      }
    }, 15000);
  });
}

async function getNgrokUrl() {
  // Wait a bit for ngrok to fully start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const response = await execPromise('curl -s http://localhost:4040/api/tunnels');
    const data = JSON.parse(response);
    
    if (data.tunnels && data.tunnels.length > 0) {
      const httpsTunnel = data.tunnels.find(t => t.proto === 'https');
      if (httpsTunnel) {
        return httpsTunnel.public_url;
      }
    }
    throw new Error('No HTTPS tunnel found');
  } catch (error) {
    log('⚠️  Could not retrieve ngrok URL automatically', colors.yellow);
    log('   Check ngrok dashboard: http://localhost:4040', colors.yellow);
    return null;
  }
}

async function updateEnvironmentVariables(ngrokUrl) {
  if (!ngrokUrl) return false;
  
  try {
    log('🔧 Updating environment variables...', colors.blue);
    
    // Update local .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add REACT_APP_API_URL
    if (envContent.includes('REACT_APP_API_URL=')) {
      envContent = envContent.replace(/REACT_APP_API_URL=.*/g, `REACT_APP_API_URL=${ngrokUrl}`);
    } else {
      envContent += `\nREACT_APP_API_URL=${ngrokUrl}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    log('✅ Updated local .env file', colors.green);
    
    // Update GitHub secret if GitHub CLI is available
    try {
      await execPromise(`gh secret set REACT_APP_API_URL --body "${ngrokUrl}"`);
      log('✅ Updated GitHub secret', colors.green);
    } catch (error) {
      // Try to fix PATH issue and retry
      try {
        const fs = require('fs');
        if (fs.existsSync('C:\\Program Files\\GitHub CLI\\gh.exe')) {
          log('🔧 GitHub CLI found, adding to PATH...', colors.yellow);
          process.env.PATH += ';C:\\Program Files\\GitHub CLI';
          await execPromise(`gh secret set REACT_APP_API_URL --body "${ngrokUrl}"`);
          log('✅ Updated GitHub secret', colors.green);
        } else {
          throw new Error('GitHub CLI not found');
        }
      } catch (retryError) {
        log('⚠️  Could not update GitHub secret automatically', colors.yellow);
        log('   Make sure GitHub CLI is installed and authenticated', colors.yellow);
        log(`   Manual update needed: REACT_APP_API_URL = ${ngrokUrl}`, colors.yellow);
        log('   Run: gh auth login --web', colors.yellow);
      }
    }
    
    return true;
  } catch (error) {
    log('❌ Failed to update environment variables', colors.red);
    return false;
  }
}

async function main() {
  try {
    log('🚀 Backend Startup - Automated Setup', colors.blue);
    log('====================================', colors.blue);
    
    // Check prerequisites
    log('\n🔍 Checking prerequisites...', colors.blue);
    const prereqsOk = await checkPrerequisites();
    if (!prereqsOk) {
      process.exit(1);
    }
    
    // Check backend dependencies
    log('\n📦 Checking backend dependencies...', colors.blue);
    const depsOk = await checkBackendDependencies();
    if (!depsOk) {
      process.exit(1);
    }
    
    // Clean up existing processes
    log('\n🧹 Cleaning up existing processes...', colors.blue);
    await killExistingProcesses();
    
    // Start backend server
    log('\n🚀 Starting services...', colors.blue);
    const backendProcess = await startBackendServer();
    
    // Wait a moment for backend to fully start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start ngrok tunnel
    const ngrokProcess = await startNgrokTunnel();
    
    // Get ngrok URL
    log('\n🔗 Retrieving ngrok URL...', colors.blue);
    const ngrokUrl = await getNgrokUrl();
    
    if (ngrokUrl) {
      log(`✅ ngrok URL: ${ngrokUrl}`, colors.green);
      
      // Update environment variables
      await updateEnvironmentVariables(ngrokUrl);
      
      log('\n🎯 Setup Complete!', colors.green);
      log('==================', colors.green);
      log(`🌐 Backend URL: ${ngrokUrl}`, colors.green);
      log('🔍 ngrok Dashboard: http://localhost:4040', colors.blue);
      log('🏥 Backend Health: http://localhost:5000/api/health', colors.blue);
      log('\n💡 Next steps:', colors.yellow);
      log('   • Make your frontend changes', colors.yellow);
      log('   • Run: npm run githubpublish', colors.yellow);
      log('   • Your live site will update automatically!', colors.yellow);
    } else {
      log('\n⚠️  Could not retrieve ngrok URL', colors.yellow);
      log('   Backend is running on http://localhost:5000', colors.yellow);
      log('   Check ngrok manually at http://localhost:4040', colors.yellow);
    }
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log('\n🛑 Shutting down services...', colors.yellow);
      backendProcess.kill();
      ngrokProcess.kill();
      process.exit(0);
    });
    
    // Keep the process alive
    log('\n⏳ Services running... Press Ctrl+C to stop', colors.cyan);
    
  } catch (error) {
    log('\n❌ Error during startup:', colors.red);
    if (error.stderr) {
      log(error.stderr, colors.red);
    } else {
      log(error.message || error, colors.red);
    }
    process.exit(1);
  }
}

main(); 