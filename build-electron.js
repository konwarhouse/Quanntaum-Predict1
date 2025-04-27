#!/usr/bin/env node

/**
 * Electron Build Script for Quanntaum Predict
 * 
 * This script builds the Electron application for Windows, macOS, and Linux
 * Usage:
 *   node build-electron.js         - Build for all platforms
 *   node build-electron.js --win   - Build for Windows only
 *   node build-electron.js --mac   - Build for macOS only
 *   node build-electron.js --linux - Build for Linux only
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Get command line arguments
const args = process.argv.slice(2);
const buildWindows = args.includes('--win') || (!args.includes('--mac') && !args.includes('--linux'));
const buildMac = args.includes('--mac') || (!args.includes('--win') && !args.includes('--linux'));
const buildLinux = args.includes('--linux') || (!args.includes('--win') && !args.includes('--mac'));

// Main paths
const rootDir = __dirname;
const electronDir = path.join(rootDir, 'electron');
const distDir = path.join(rootDir, 'dist');
const distElectronDir = path.join(rootDir, 'dist_electron');

// Print header
console.log(`${colors.bright}${colors.cyan}==============================================${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}      Building Quanntaum Predict Electron App${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}==============================================${colors.reset}`);
console.log('');

// Create dist_electron directory if it doesn't exist
if (!fs.existsSync(distElectronDir)) {
  fs.mkdirSync(distElectronDir, { recursive: true });
}

// Verify electron directory exists
if (!fs.existsSync(electronDir)) {
  console.error(`${colors.red}Error: electron directory not found at ${electronDir}${colors.reset}`);
  process.exit(1);
}

// Function to execute shell commands with promise
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`${colors.yellow}Executing: ${command}${colors.reset}`);
    
    const child = exec(command, options, (error, stdout, stderr) => {
      if (error) {
        console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
        return reject(error);
      }
      if (stderr) {
        console.warn(`${colors.yellow}Warning: ${stderr}${colors.reset}`);
      }
      resolve(stdout);
    });
    
    // Stream output for better visibility
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });
}

// Function to run the electron-builder with platform-specific args
async function buildElectron(platforms) {
  try {
    // Make sure we're in the electron directory
    process.chdir(electronDir);
    
    // Build commands
    let buildCommand = 'npx electron-builder';
    
    if (platforms.length > 0) {
      buildCommand += ` --${platforms.join(' --')}`;
    }
    
    // Set environment variables for native modules
    const env = {
      ...process.env,
      // Add electron-specific env vars here if needed
    };
    
    await execCommand(buildCommand, { env });
    
    // Move the builds to dist_electron
    const outputDir = path.join(electronDir, 'dist');
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      files.forEach(file => {
        const srcPath = path.join(outputDir, file);
        const destPath = path.join(distElectronDir, file);
        
        // Copy the file
        if (fs.statSync(srcPath).isFile()) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`${colors.green}Copied: ${destPath}${colors.reset}`);
        } else {
          // It's a directory, need to recursively copy
          // For simplicity, we'll use shell commands for directory copy
          const copyCmd = process.platform === 'win32' 
            ? `xcopy "${srcPath}" "${destPath}" /E /I /Y` 
            : `cp -r "${srcPath}" "${destPath}"`;
          
          try {
            require('child_process').execSync(copyCmd);
            console.log(`${colors.green}Copied directory: ${destPath}${colors.reset}`);
          } catch (err) {
            console.error(`${colors.red}Failed to copy directory: ${err.message}${colors.reset}`);
          }
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Build failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Main build process
async function main() {
  try {
    // Make sure frontend is built
    if (!fs.existsSync(distDir) || fs.readdirSync(distDir).length === 0) {
      console.log(`${colors.yellow}Building frontend app first...${colors.reset}`);
      
      await execCommand('npm run build', { cwd: rootDir });
    }
    
    // Determine which platforms to build for
    const platforms = [];
    
    if (buildWindows) {
      platforms.push('win');
      console.log(`${colors.blue}Building for Windows...${colors.reset}`);
    }
    
    if (buildMac) {
      platforms.push('mac');
      console.log(`${colors.blue}Building for macOS...${colors.reset}`);
    }
    
    if (buildLinux) {
      platforms.push('linux');
      console.log(`${colors.blue}Building for Linux...${colors.reset}`);
    }
    
    // Build Electron app for selected platforms
    const success = await buildElectron(platforms);
    
    if (success) {
      console.log('');
      console.log(`${colors.green}${colors.bright}==============================================`);
      console.log(`     Build Completed Successfully!     `);
      console.log(`===============================================${colors.reset}`);
      console.log(`${colors.blue}The installer packages are available in:`);
      console.log(`  ${distElectronDir}${colors.reset}`);
    } else {
      console.log('');
      console.log(`${colors.red}${colors.bright}==============================================`);
      console.log(`     Build Failed!     `);
      console.log(`===============================================${colors.reset}`);
      console.log('Check the error messages above for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Build process failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the main function
main();