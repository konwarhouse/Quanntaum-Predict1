#!/usr/bin/env node

/**
 * Electron Test Script for Quanntaum Predict
 * 
 * This script runs the application in Electron for testing purposes
 * Usage: node test-electron.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Print header
console.log(`${colors.bright}${colors.cyan}==============================================${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}      Testing Quanntaum Predict in Electron${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}==============================================${colors.reset}`);
console.log('');

// Verify electron directory exists
const electronDir = path.join(__dirname, 'electron');
if (!fs.existsSync(electronDir)) {
  console.error(`${colors.red}Error: electron directory not found at ${electronDir}${colors.reset}`);
  console.error(`${colors.yellow}Run setup-electron-deps.sh first to set up the Electron environment${colors.reset}`);
  process.exit(1);
}

function startElectron() {
  console.log(`${colors.yellow}Starting Electron in development mode...${colors.reset}`);
  
  // Set environment variables
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    ELECTRON_RUN: 'true'
  };
  
  // Running with npx ensures we use the locally installed electron
  const electronProcess = spawn('npx', ['electron', '.'], {
    cwd: electronDir,
    env,
    stdio: 'inherit'
  });
  
  electronProcess.on('error', (err) => {
    console.error(`${colors.red}Failed to start Electron: ${err.message}${colors.reset}`);
    console.error(`${colors.yellow}Make sure electron is installed in the electron directory${colors.reset}`);
    process.exit(1);
  });
  
  electronProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`${colors.red}Electron exited with code ${code}${colors.reset}`);
    } else {
      console.log(`${colors.green}Electron closed successfully${colors.reset}`);
    }
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log(`${colors.yellow}Stopping Electron test...${colors.reset}`);
    electronProcess.kill();
  });
}

// Start the Electron app
startElectron();