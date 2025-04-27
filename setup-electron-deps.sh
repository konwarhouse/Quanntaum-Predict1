#!/bin/bash

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=======================================================${NC}"
echo -e "${CYAN}   Setting up Electron Dependencies for Quanntaum Predict${NC}"
echo -e "${CYAN}=======================================================${NC}"
echo

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo -e "${RED}Error: npm is not installed. Please install Node.js and npm first.${NC}"
  exit 1
fi

# Function to handle errors
handle_error() {
  echo -e "${RED}Error: $1${NC}"
  exit 1
}

# Make sure the electron directory exists
if [ ! -d "electron" ]; then
  echo -e "${YELLOW}Creating electron directory...${NC}"
  mkdir -p electron || handle_error "Could not create electron directory"
fi

# Create package.json for electron directory if it doesn't exist
if [ ! -f "electron/package.json" ]; then
  echo -e "${YELLOW}Creating electron/package.json...${NC}"
  cat > electron/package.json << 'EOF'
{
  "name": "quanntaum-predict",
  "version": "1.0.0",
  "description": "Quanntaum Predict - Advanced Reliability Engineering Platform",
  "main": "main.js",
  "author": "Quanntaum Technologies",
  "license": "UNLICENSED",
  "private": true,
  "dependencies": {
    "electron-log": "^4.4.8",
    "electron-store": "^8.1.0"
  },
  "devDependencies": {
    "electron": "^28.2.3",
    "electron-builder": "^24.9.1"
  },
  "build": {
    "appId": "com.quanntaum.predict",
    "productName": "Quanntaum Predict",
    "directories": {
      "output": "dist"
    }
  }
}
EOF
fi

# Create electron-builder.yml file if it doesn't exist
if [ ! -f "electron/electron-builder.yml" ]; then
  echo -e "${YELLOW}Creating electron/electron-builder.yml...${NC}"
  cat > electron/electron-builder.yml << 'EOF'
appId: com.quanntaum.predict
productName: Quanntaum Predict
copyright: Copyright © 2025 Quanntaum Technologies

directories:
  output: dist
  buildResources: resources

files:
  - from: .
    filter:
      - package.json
      - main.js
      - preload.js
  - from: ../dist
    to: .
    filter:
      - "**/*"

# macOS specific configuration
mac:
  category: public.app-category.business
  target: 
    - dmg
    - zip
  icon: icon.icns
  darkModeSupport: true
  hardenedRuntime: true
  entitlements: entitlements.plist
  entitlementsInherit: entitlements.plist

# Windows specific configuration
win:
  target:
    - nsis
    - portable
  icon: icon.ico

# Linux specific configuration
linux:
  target:
    - AppImage
    - deb
    - rpm
  category: Office
  icon: icon.png

# NSIS installer configuration for Windows
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: Quanntaum Predict

# DMG configuration for macOS
dmg:
  background: dmg-background.png
  icon: icon.icns
  iconSize: 128
  window:
    width: 540
    height: 380

# AppImage configuration for Linux
appImage:
  license: LICENSE
EOF
fi

# Create main.js for electron if it doesn't exist
if [ ! -f "electron/main.js" ]; then
  echo -e "${YELLOW}Creating electron/main.js...${NC}"
  cat > electron/main.js << 'EOF'
const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const log = require('electron-log');
const Store = require('electron-store');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('Application starting...');

// Set app version from package.json
const appVersion = app.getVersion();
log.info(`App version: ${appVersion}`);

// Initialize settings store
const store = new Store();

// Set environment variable to indicate Electron mode
process.env.ELECTRON_RUN = 'true';

let mainWindow;
let serverProcess;
let serverPort = 5000;

function createWindow() {
  log.info('Creating main window...');
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Quanntaum Predict',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    },
    icon: path.join(__dirname, 'resources', 'icon.png'),
    show: false
  });

  // Add a loading screen
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  
  // Open the DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startServer() {
  log.info('Starting backend server...');
  
  try {
    const serverPath = path.join(__dirname, 'server.js');
    
    // Set environment variables for server
    const env = { 
      ...process.env,
      NODE_ENV: 'production',
      ELECTRON_RUN: 'true',
      PORT: serverPort
    };
    
    // Start the server process
    serverProcess = spawn('node', [serverPath], { 
      env, 
      stdio: ['ignore', 'pipe', 'pipe'] 
    });
    
    // Log server output
    serverProcess.stdout.on('data', (data) => {
      log.info(`Server: ${data.toString().trim()}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      log.error(`Server error: ${data.toString().trim()}`);
    });
    
    // Handle server close
    serverProcess.on('close', (code) => {
      log.info(`Server process exited with code ${code}`);
      if (code !== 0 && !app.isQuitting) {
        dialog.showErrorBox(
          'Server Error',
          `The backend server has stopped unexpectedly (code ${code}). The application will now close.`
        );
        app.quit();
      }
    });
    
    // Wait for server to be ready
    await waitForServerReady(30);
    
    // Connect to the server
    mainWindow.loadURL(`http://localhost:${serverPort}`);
    
  } catch (error) {
    log.error('Failed to start server:', error);
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start the application server: ${error.message}`
    );
    app.quit();
  }
}

// Helper to wait for server readiness
function waitForServerReady(maxRetries, delay = 500) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const http = require('http');
    
    const checkServer = () => {
      const req = http.request({
        hostname: 'localhost',
        port: serverPort,
        path: '/',
        method: 'HEAD',
        timeout: 1000
      }, (res) => {
        resolve();
      });
      
      req.on('error', (err) => {
        retries++;
        if (retries >= maxRetries) {
          reject(new Error(`Server not ready after ${retries} attempts: ${err.message}`));
        } else {
          setTimeout(checkServer, delay);
        }
      });
      
      req.end();
    };
    
    setTimeout(checkServer, delay);
  });
}

// App ready event
app.whenReady().then(async () => {
  log.info('Application ready event...');
  
  // Create window first
  createWindow();
  
  // Start the server
  try {
    await startServer();
  } catch (error) {
    log.error('Failed during startup:', error);
  }
  
  // Handle macOS
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up on app quit
app.on('before-quit', () => {
  log.info('Application quitting...');
  app.isQuitting = true;
  
  if (serverProcess) {
    log.info('Terminating server process...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
    } else {
      serverProcess.kill('SIGTERM');
    }
  }
});

// IPC commands from renderer
ipcMain.handle('app:version', () => {
  return appVersion;
});

ipcMain.handle('app:platform', () => {
  return process.platform;
});

ipcMain.handle('app:open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (canceled || filePaths.length === 0) return null;
  
  const filePath = filePaths[0];
  return { path: filePath, content: fs.readFileSync(filePath, 'utf8') };
});
EOF
fi

# Create preload.js for electron if it doesn't exist
if [ ! -f "electron/preload.js" ]; then
  echo -e "${YELLOW}Creating electron/preload.js...${NC}"
  cat > electron/preload.js << 'EOF'
const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  platform: process.platform,
  version: process.env.npm_package_version,
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  
  // File operations
  openFile: () => ipcRenderer.invoke('app:open-file'),
  
  // System information
  getOsInfo: () => {
    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      userInfo: os.userInfo().username,
      homeDir: os.homedir(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)), // in GB
      freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)), // in GB
    };
  }
});
EOF
fi

# Create loading.html for electron if it doesn't exist
if [ ! -f "electron/loading.html" ]; then
  echo -e "${YELLOW}Creating electron/loading.html...${NC}"
  cat > electron/loading.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Loading Quanntaum Predict</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
                    Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
      color: white;
    }
    .container {
      text-align: center;
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      background: linear-gradient(to right, #4facfe 0%, #00f2fe 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      font-size: 1.2em;
      margin-bottom: 20px;
      opacity: 0.9;
    }
    .loader {
      width: 80px;
      height: 80px;
      border: 6px solid rgba(255, 255, 255, 0.2);
      border-top: 6px solid #4facfe;
      border-radius: 50%;
      animation: spin 1.5s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Quanntaum Predict</h1>
    <p>Loading application...</p>
    <div class="loader"></div>
    <p>This may take a few moments</p>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Loading screen initialized');
    });
  </script>
</body>
</html>
EOF
fi

# Create server.js for electron if it doesn't exist
if [ ! -f "electron/server.js" ]; then
  echo -e "${YELLOW}Creating electron/server.js...${NC}"
  cat > electron/server.js << 'EOF'
// This is the standalone server for Electron
// It loads the compiled server code and runs it with Electron-specific configuration

// Set environment variables
process.env.ELECTRON_RUN = 'true';
process.env.NODE_ENV = 'production';

// Redirect console output to electron-log in main process
console.log = (...args) => {
  if (process.send) {
    process.send({ type: 'log', data: args });
  }
};

console.error = (...args) => {
  if (process.send) {
    process.send({ type: 'error', data: args });
  }
};

// Load the compiled server
console.log('Starting Quanntaum Predict server in Electron mode');
try {
  // The compiled server file is in the 'dist' directory
  require('../dist/index.js');
} catch (error) {
  console.error('Failed to start server:', error);
  // Exit with error code
  process.exit(1);
}
EOF
fi

# Create entitlements.plist for macOS if it doesn't exist
if [ ! -f "electron/entitlements.plist" ]; then
  echo -e "${YELLOW}Creating electron/entitlements.plist...${NC}"
  cat > electron/entitlements.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
EOF
fi

# Install electron development dependencies
echo -e "${BLUE}Installing Electron dependencies...${NC}"
cd electron

# Install dependencies
echo -e "${YELLOW}Running npm install in electron directory...${NC}"
npm install || { 
  echo -e "${RED}Failed to install project dependencies${NC}"; 
  exit 1; 
}

# Create convenience scripts for Electron operations
echo -e "${BLUE}Creating convenience scripts...${NC}"

# Create electron-test.sh
cat > electron-test.sh << 'EOF'
#!/bin/bash
node test-electron.js
EOF
chmod +x electron-test.sh

# Create electron-build.sh
cat > electron-build.sh << 'EOF'
#!/bin/bash
# Check if arguments are provided
if [ $# -eq 0 ]; then
  # No arguments, build for all platforms
  node build-electron.js
else
  # Pass all arguments to build-electron.js
  node build-electron.js "$@"
fi
EOF
chmod +x electron-build.sh

# Create platform-specific scripts
cat > electron-build-win.sh << 'EOF'
#!/bin/bash
node build-electron.js --win
EOF
chmod +x electron-build-win.sh

cat > electron-build-mac.sh << 'EOF'
#!/bin/bash
node build-electron.js --mac
EOF
chmod +x electron-build-mac.sh

cat > electron-build-linux.sh << 'EOF'
#!/bin/bash
node build-electron.js --linux
EOF
chmod +x electron-build-linux.sh

echo -e "${GREEN}Convenience scripts created successfully!${NC}"
echo -e "${GREEN}All dependencies installed successfully!${NC}"
echo -e "${CYAN}=======================================================${NC}"
echo -e "${CYAN}   Setup Complete!                                     ${NC}"
echo -e "${CYAN}=======================================================${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Run ${MAGENTA}npm run build${NC} to build the frontend"
echo -e "2. Run ${MAGENTA}./electron-test.sh${NC} to test the app in Electron"
echo -e "3. Run ${MAGENTA}./electron-build.sh${NC} to build the desktop app"
echo -e "   - For Windows: ${MAGENTA}./electron-build-win.sh${NC}"
echo -e "   - For macOS: ${MAGENTA}./electron-build-mac.sh${NC}"
echo -e "   - For Linux: ${MAGENTA}./electron-build-linux.sh${NC}"
echo
echo -e "${BLUE}The packaged app will be available in the dist_electron directory${NC}"