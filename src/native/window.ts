import { type ChildProcess, spawn } from 'node:child_process';
import { chmodSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CleanupFn, FeatureResult } from '../types.js';
import {
  commandExists,
  getPlatform,
  getScreenDimensions,
  hasWmctrl,
  raiseWindow,
} from '../utils/platform.js';

// Track temp directories for cleanup
const tempDirs: string[] = [];

/**
 * Files to simulate installing - extensive list for longer runtime
 */
const installFiles = [
  // Core dependencies
  'node_modules/@types/node/index.d.ts',
  'node_modules/@types/node/fs.d.ts',
  'node_modules/@types/node/path.d.ts',
  'node_modules/@types/node/http.d.ts',
  'node_modules/@types/node/crypto.d.ts',
  'node_modules/@types/react/index.d.ts',
  'node_modules/@types/react-dom/index.d.ts',
  'node_modules/typescript/lib/typescript.js',
  'node_modules/typescript/lib/tsserver.js',
  'node_modules/typescript/lib/lib.es2022.d.ts',
  // React ecosystem
  'node_modules/react/cjs/react.production.min.js',
  'node_modules/react/cjs/react.development.js',
  'node_modules/react-dom/cjs/react-dom.production.min.js',
  'node_modules/react-dom/cjs/react-dom-server.browser.production.min.js',
  'node_modules/react-router-dom/dist/index.js',
  'node_modules/react-query/build/index.js',
  'node_modules/react-hook-form/dist/index.esm.js',
  'node_modules/@tanstack/react-table/build/lib/index.js',
  // Build tools
  'node_modules/webpack/lib/webpack.js',
  'node_modules/webpack/lib/Compiler.js',
  'node_modules/webpack/lib/Compilation.js',
  'node_modules/webpack/lib/NormalModule.js',
  'node_modules/webpack-dev-server/lib/Server.js',
  'node_modules/esbuild/lib/main.js',
  'node_modules/vite/dist/node/index.js',
  'node_modules/rollup/dist/rollup.js',
  'node_modules/terser/dist/bundle.min.js',
  // Loaders and plugins
  'node_modules/babel-loader/lib/index.js',
  'node_modules/@babel/core/lib/index.js',
  'node_modules/@babel/preset-env/lib/index.js',
  'node_modules/@babel/preset-react/lib/index.js',
  'node_modules/@babel/preset-typescript/lib/index.js',
  'node_modules/css-loader/dist/index.js',
  'node_modules/style-loader/dist/index.js',
  'node_modules/postcss-loader/dist/index.js',
  'node_modules/sass-loader/dist/index.js',
  'node_modules/file-loader/dist/index.js',
  'node_modules/url-loader/dist/index.js',
  'node_modules/html-webpack-plugin/index.js',
  'node_modules/mini-css-extract-plugin/dist/index.js',
  'node_modules/terser-webpack-plugin/dist/index.js',
  'node_modules/copy-webpack-plugin/dist/index.js',
  // Testing
  'node_modules/jest/build/jest.js',
  'node_modules/@jest/core/build/index.js',
  'node_modules/vitest/dist/index.js',
  'node_modules/@testing-library/react/dist/index.js',
  'node_modules/@testing-library/dom/dist/index.js',
  'node_modules/cypress/lib/cypress.js',
  'node_modules/playwright/lib/index.js',
  // Linting and formatting
  'node_modules/eslint/lib/api.js',
  'node_modules/eslint/lib/cli-engine/cli-engine.js',
  'node_modules/@typescript-eslint/parser/dist/index.js',
  'node_modules/@typescript-eslint/eslint-plugin/dist/index.js',
  'node_modules/prettier/index.js',
  'node_modules/prettier/parser-typescript.js',
  // UI libraries
  'node_modules/@mui/material/index.js',
  'node_modules/@mui/icons-material/index.js',
  'node_modules/@emotion/react/dist/index.js',
  'node_modules/@emotion/styled/dist/index.js',
  'node_modules/tailwindcss/lib/index.js',
  'node_modules/tailwindcss/plugin.js',
  'node_modules/@headlessui/react/dist/index.js',
  'node_modules/framer-motion/dist/index.js',
  // State management
  'node_modules/redux/dist/redux.js',
  'node_modules/@reduxjs/toolkit/dist/index.js',
  'node_modules/zustand/esm/index.js',
  'node_modules/jotai/esm/index.js',
  'node_modules/recoil/dist/index.js',
  // Utilities
  'node_modules/lodash/lodash.js',
  'node_modules/axios/dist/axios.js',
  'node_modules/date-fns/index.js',
  'node_modules/dayjs/dayjs.min.js',
  'node_modules/uuid/dist/index.js',
  'node_modules/zod/lib/index.js',
  'node_modules/yup/lib/index.js',
  // Build outputs
  'dist/main.bundle.js',
  'dist/vendor.bundle.js',
  'dist/runtime.bundle.js',
  'dist/main.bundle.js.map',
  'dist/styles.css',
  'dist/styles.css.map',
  'dist/assets/logo.png',
  'dist/assets/icons/favicon.ico',
  'dist/assets/fonts/inter-var.woff2',
  // Source files
  'public/index.html',
  'src/index.tsx',
  'src/App.tsx',
  'src/components/Header.tsx',
  'src/components/Footer.tsx',
  'src/components/Sidebar.tsx',
  'src/components/Modal.tsx',
  'src/components/Button.tsx',
  'src/components/Input.tsx',
  'src/components/Table.tsx',
  'src/components/Card.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/Settings.tsx',
  'src/pages/Profile.tsx',
  'src/utils/api.ts',
  'src/utils/helpers.ts',
  'src/utils/constants.ts',
  'src/utils/validation.ts',
  'src/hooks/useAuth.ts',
  'src/hooks/useApi.ts',
  'src/hooks/useLocalStorage.ts',
  'src/hooks/useDebounce.ts',
  'src/store/index.ts',
  'src/store/slices/userSlice.ts',
  'src/store/slices/appSlice.ts',
  'src/types/index.ts',
  'src/types/api.ts',
  // Config files
  'config/webpack.config.js',
  'config/webpack.dev.js',
  'config/webpack.prod.js',
  'config/jest.config.js',
  'config/tailwind.config.js',
  '.env.production',
  '.env.development',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.build.json',
  '.eslintrc.json',
  '.prettierrc',
  'README.md',
  'CHANGELOG.md',
];

/**
 * Generate a shell script for Linux that shows a fake installer progress
 * Single window with sequential progress phases, cancel button available
 */
function generateLinuxScript(): string {
  // Get screen dimensions for centering
  const screen = getScreenDimensions();
  const centerX = Math.floor((screen.width - 600) / 2);

  return `#!/bin/bash

# Screen center coordinates for window positioning
CENTER_X=${centerX}

# Trap to handle cancel button
trap "exit 0" SIGTERM SIGINT

run_multi_phase() {
  local cycle=$1
  
  (
    # Phase 1: Resolving dependencies (0-15%)
    echo "0"
    echo "# [1/6] Resolving dependencies..."
    for i in $(seq 1 15); do
      echo "$i"
      sleep 0.3
    done
    
    # Phase 2: Downloading packages (15-35%)
    echo "# [2/6] Downloading packages..."
    for i in $(seq 15 35); do
      echo "$i"
      if [ $((i % 3)) -eq 0 ]; then
        echo "# [2/6] Downloading: package-$((i * 7))@1.$((i % 10)).0"
      fi
      sleep 0.25
    done
    
    # Phase 3: Installing packages (35-60%)
    echo "# [3/6] Installing packages..."
    for i in $(seq 35 60); do
      echo "$i"
      if [ $((i % 2)) -eq 0 ]; then
        echo "# [3/6] Installing: node_modules/dep-$((i * 3))/index.js"
      fi
      sleep 0.2
    done
    
    # Phase 4: Building native modules (60-75%)
    echo "# [4/6] Building native modules..."
    for i in $(seq 60 75); do
      echo "$i"
      sleep 0.4
    done
    
    # Phase 5: Running postinstall (75-90%)
    echo "# [5/6] Running postinstall scripts..."
    for i in $(seq 75 90); do
      echo "$i"
      sleep 0.3
    done
    
    # Phase 6: Finalizing (90-100%)
    echo "# [6/6] Finalizing installation..."
    for i in $(seq 90 100); do
      echo "$i"
      sleep 0.2
    done
    
    echo "100"
    echo "# Cycle $cycle complete! Starting next cycle..."
    sleep 2
  ) | zenity --progress \\
    --title="Package Installation - Build Cycle $cycle" \\
    --text="Initializing..." \\
    --percentage=0 \\
    --auto-close \\
    --width=600 \\
    --height=120 2>/dev/null
  
  return $?
}

# Position window after first launch
position_window() {
  sleep 0.5
  if command -v wmctrl &> /dev/null; then
    wmctrl -r "Package Installation" -e 0,\${CENTER_X},100,-1,-1 2>/dev/null || true
  fi
}

# Main loop - cycles through installation phases indefinitely
cycle=1
while true; do
  # Start positioning in background for first cycle
  if [ $cycle -eq 1 ]; then
    position_window &
  fi
  
  run_multi_phase $cycle
  exit_code=$?
  
  # If user clicked cancel (exit code 1), exit the script
  if [ $exit_code -ne 0 ]; then
    exit 0
  fi
  
  cycle=$((cycle + 1))
  sleep 1
done
`;
}

/**
 * Generate a shell script for Linux using yad (alternative to zenity)
 * Uses yad's multi-progress feature for a better UI
 */
function generateLinuxYadScript(): string {
  // Get screen dimensions for centering
  const screen = getScreenDimensions();
  const centerX = Math.floor((screen.width - 600) / 2);

  return `#!/bin/bash

# Center position for yad windows
CENTER_X=${centerX}

# Trap to handle cancel button
trap "exit 0" SIGTERM SIGINT

run_multi_progress() {
  local cycle=$1
  
  (
    # Phase 1: Resolving dependencies
    for i in $(seq 0 5 100); do
      echo "1:$i"
      echo "1:# Resolving dependencies..."
      sleep 0.15
    done
    
    # Phase 2: Downloading packages  
    for i in $(seq 0 3 100); do
      echo "2:$i"
      echo "2:# Downloading package $((i * 2 + cycle))..."
      sleep 0.1
    done
    
    # Phase 3: Installing
    for i in $(seq 0 2 100); do
      echo "3:$i"
      echo "3:# Installing node_modules/pkg-$i..."
      sleep 0.08
    done
    
    # Phase 4: Building
    for i in $(seq 0 4 100); do
      echo "4:$i"
      echo "4:# Compiling module $i..."
      sleep 0.12
    done
    
    # Phase 5: Optimizing
    for i in $(seq 0 5 100); do
      echo "5:$i"
      echo "5:# Optimizing bundle..."
      sleep 0.1
    done
    
    # Phase 6: Finalizing
    for i in $(seq 0 10 100); do
      echo "6:$i"
      echo "6:# Finalizing..."
      sleep 0.15
    done
    
    sleep 2
  ) | yad --multi-progress \\
    --title="Package Installation - Build Cycle $cycle" \\
    --geometry=600x350+\${CENTER_X}+100 \\
    --on-top \\
    --bar="Dependencies:NORM" \\
    --bar="Download:NORM" \\
    --bar="Install:NORM" \\
    --bar="Build:NORM" \\
    --bar="Optimize:NORM" \\
    --bar="Finalize:NORM" \\
    --button="Cancel:1" \\
    --auto-close 2>/dev/null
  
  return $?
}

# Fallback to single progress if multi-progress fails
run_single_progress() {
  local cycle=$1
  
  (
    for phase in "Resolving dependencies" "Downloading packages" "Installing packages" "Building modules" "Optimizing" "Finalizing"; do
      for i in $(seq 0 5 100); do
        echo "$i"
        echo "# $phase..."
        sleep 0.1
      done
    done
    sleep 1
  ) | yad --progress \\
    --title="Package Installation - Cycle $cycle" \\
    --text="Initializing..." \\
    --geometry=600x120+\${CENTER_X}+100 \\
    --on-top \\
    --button="Cancel:1" \\
    --auto-close 2>/dev/null
  
  return $?
}

# Main loop
cycle=1
while true; do
  # Try multi-progress first, fall back to single
  run_multi_progress $cycle
  exit_code=$?
  
  # If yad multi-progress not supported, try single progress
  if [ $exit_code -eq 252 ]; then
    run_single_progress $cycle
    exit_code=$?
  fi
  
  # If user clicked cancel, exit
  if [ $exit_code -ne 0 ]; then
    exit 0
  fi
  
  cycle=$((cycle + 1))
  sleep 1
done
`;
}

/**
 * Generate AppleScript for macOS native progress dialog
 * Shows rotating messages for a busier appearance, with Cancel button
 */
function generateMacScript(): string {
  return `
set phaseMessages to {"[1/6] Resolving dependency tree...", "[2/6] Downloading packages from registry...", "[3/6] Installing node_modules...", "[4/6] Building native modules...", "[5/6] Running postinstall scripts...", "[6/6] Optimizing bundle..."}

set detailMessages to {"Processing 847 packages", "Compiling 234 modules", "Analyzing 156 dependencies", "Running 89 scripts", "Checking 1,247 types", "Optimizing 67 chunks"}

set phaseIndex to 1
set detailIndex to 1
set cycleCount to 1

tell application "System Events"
  repeat
    set currentPhase to item phaseIndex of phaseMessages
    set currentDetail to item detailIndex of detailMessages
    set progressText to "Cycle " & cycleCount & " - " & currentPhase & return & return & currentDetail
    
    try
      display dialog progressText buttons {"Cancel", "Installing..."} default button "Installing..." giving up after 5 with title "Package Installation" with icon note
      set dialogResult to result
      
      if button returned of dialogResult is "Cancel" then
        exit repeat
      end if
    on error
      -- User closed the dialog
      exit repeat
    end try
    
    set phaseIndex to (phaseIndex mod (count of phaseMessages)) + 1
    set detailIndex to (detailIndex mod (count of detailMessages)) + 1
    
    if phaseIndex = 1 then
      set cycleCount to cycleCount + 1
    end if
    
    delay 0.3
  end repeat
end tell
`;
}

/**
 * Generate PowerShell script for Windows native progress dialog
 * Shows detailed progress with file names and phases
 */
function generateWindowsScript(): string {
  // Include a good selection of files for Windows
  const windowsFiles = installFiles
    .slice(0, 60)
    .map((f) => `"${f}"`)
    .join(',\n  ');

  return `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Package Installation"
$form.Size = New-Object System.Drawing.Size(580, 280)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.BackColor = [System.Drawing.Color]::White

$phaseLabel = New-Object System.Windows.Forms.Label
$phaseLabel.Location = New-Object System.Drawing.Point(20, 15)
$phaseLabel.Size = New-Object System.Drawing.Size(530, 25)
$phaseLabel.Text = "Preparing installation..."
$phaseLabel.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
$phaseLabel.ForeColor = [System.Drawing.Color]::FromArgb(51, 51, 51)
$form.Controls.Add($phaseLabel)

$detailLabel = New-Object System.Windows.Forms.Label
$detailLabel.Location = New-Object System.Drawing.Point(20, 42)
$detailLabel.Size = New-Object System.Drawing.Size(530, 20)
$detailLabel.Text = "This may take several minutes..."
$detailLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$detailLabel.ForeColor = [System.Drawing.Color]::Gray
$form.Controls.Add($detailLabel)

$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(20, 70)
$progressBar.Size = New-Object System.Drawing.Size(520, 23)
$progressBar.Style = "Continuous"
$progressBar.Value = 0
$form.Controls.Add($progressBar)

$percentLabel = New-Object System.Windows.Forms.Label
$percentLabel.Location = New-Object System.Drawing.Point(460, 96)
$percentLabel.Size = New-Object System.Drawing.Size(80, 20)
$percentLabel.Text = "0%"
$percentLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$percentLabel.ForeColor = [System.Drawing.Color]::FromArgb(102, 126, 234)
$percentLabel.TextAlign = [System.Drawing.ContentAlignment]::TopRight
$form.Controls.Add($percentLabel)

$fileLabel = New-Object System.Windows.Forms.Label
$fileLabel.Location = New-Object System.Drawing.Point(20, 96)
$fileLabel.Size = New-Object System.Drawing.Size(430, 18)
$fileLabel.ForeColor = [System.Drawing.Color]::FromArgb(100, 100, 100)
$fileLabel.Font = New-Object System.Drawing.Font("Consolas", 8)
$form.Controls.Add($fileLabel)

$logBox = New-Object System.Windows.Forms.ListBox
$logBox.Location = New-Object System.Drawing.Point(20, 120)
$logBox.Size = New-Object System.Drawing.Size(520, 80)
$logBox.Font = New-Object System.Drawing.Font("Consolas", 8)
$logBox.ForeColor = [System.Drawing.Color]::FromArgb(80, 80, 80)
$logBox.BackColor = [System.Drawing.Color]::FromArgb(248, 249, 250)
$logBox.BorderStyle = "None"
$form.Controls.Add($logBox)

$statsLabel = New-Object System.Windows.Forms.Label
$statsLabel.Location = New-Object System.Drawing.Point(20, 208)
$statsLabel.Size = New-Object System.Drawing.Size(400, 20)
$statsLabel.Text = "Packages: 0 | Elapsed: 0:00"
$statsLabel.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$statsLabel.ForeColor = [System.Drawing.Color]::Gray
$form.Controls.Add($statsLabel)

$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Location = New-Object System.Drawing.Point(450, 203)
$cancelButton.Size = New-Object System.Drawing.Size(90, 28)
$cancelButton.Text = "Cancel"
$cancelButton.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$cancelButton.Add_Click({ $form.Close() })
$form.Controls.Add($cancelButton)

$files = @(
  ${windowsFiles}
)

$phases = @(
  "Resolving dependency tree...",
  "Downloading packages...",
  "Installing dependencies...",
  "Building native modules...",
  "Linking packages...",
  "Running postinstall scripts...",
  "Compiling TypeScript...",
  "Optimizing bundles...",
  "Generating sourcemaps...",
  "Running type checks...",
  "Building for production...",
  "Finalizing installation..."
)

$script:fileIndex = 0
$script:phaseIndex = 0
$script:startTime = Get-Date
$script:packagesInstalled = 0
$script:cycle = 1

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 400

$timer.Add_Tick({
  $elapsed = (Get-Date) - $script:startTime
  $elapsedStr = "{0}:{1:D2}" -f [math]::Floor($elapsed.TotalMinutes), $elapsed.Seconds
  
  $currentFile = $files[$script:fileIndex % $files.Count]
  $currentPhase = $phases[$script:phaseIndex % $phases.Count]
  
  $phaseLabel.Text = $currentPhase
  $fileLabel.Text = "Installing: " + $currentFile.Split("/")[-1]
  
  $progressValue = ($script:fileIndex % $files.Count) * 100 / $files.Count
  $progressBar.Value = [math]::Min(100, [math]::Floor($progressValue))
  $percentLabel.Text = [math]::Floor($progressValue).ToString() + "%"
  
  $logBox.Items.Add("+ " + $currentFile)
  if ($logBox.Items.Count -gt 6) {
    $logBox.Items.RemoveAt(0)
  }
  $logBox.TopIndex = $logBox.Items.Count - 1
  
  $script:packagesInstalled++
  $statsLabel.Text = "Packages: " + $script:packagesInstalled.ToString() + " | Elapsed: " + $elapsedStr + " | Cycle: " + $script:cycle.ToString()
  
  $script:fileIndex++
  
  if ($script:fileIndex % 8 -eq 0) {
    $script:phaseIndex++
  }
  
  if ($script:fileIndex % $files.Count -eq 0) {
    $script:cycle++
    $detailLabel.Text = "Starting cycle " + $script:cycle.ToString() + "..."
  }
})

$timer.Start()
$form.ShowDialog()
`;
}

/**
 * Create a secure temporary script file
 * - Creates in a unique temp directory
 * - Sets restrictive permissions (owner read/execute only)
 * - Tracks for cleanup
 */
function createSecureTempScript(content: string, filename: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'ocupado-'));
  tempDirs.push(tempDir);

  const scriptPath = join(tempDir, filename);

  // Write with restrictive permissions: owner read/write only
  writeFileSync(scriptPath, content, { mode: 0o600 });

  // Make executable for owner only
  chmodSync(scriptPath, 0o700);

  return scriptPath;
}

/**
 * Clean up all temporary files and directories
 */
function cleanupTempFiles(): void {
  for (const dir of tempDirs) {
    try {
      // Try to remove files in the directory
      const scriptPath = join(dir, 'installer.sh');
      try {
        unlinkSync(scriptPath);
      } catch {}
      const scptPath = join(dir, 'installer.scpt');
      try {
        unlinkSync(scptPath);
      } catch {}
      const ps1Path = join(dir, 'installer.ps1');
      try {
        unlinkSync(ps1Path);
      } catch {}

      // Remove the directory
      rmdirSync(dir);
    } catch {
      // Ignore errors during cleanup
    }
  }
  tempDirs.length = 0;
}

/**
 * Launch native window on Linux
 */
async function launchLinuxWindow(): Promise<ChildProcess | null> {
  // Try zenity first (most common)
  if (commandExists('zenity')) {
    const scriptPath = createSecureTempScript(generateLinuxScript(), 'installer.sh');

    const child = spawn('bash', [scriptPath], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    return child;
  }

  // Try yad as alternative
  if (commandExists('yad')) {
    const scriptPath = createSecureTempScript(generateLinuxYadScript(), 'installer.sh');

    const child = spawn('bash', [scriptPath], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    return child;
  }

  console.warn('No dialog tool found (zenity or yad). Skipping native window.');
  return null;
}

/**
 * Launch native window on macOS
 */
async function launchMacWindow(): Promise<ChildProcess | null> {
  const scriptPath = createSecureTempScript(generateMacScript(), 'installer.scpt');

  const child = spawn('osascript', [scriptPath], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  return child;
}

/**
 * Launch native window on Windows
 */
async function launchWindowsWindow(): Promise<ChildProcess | null> {
  const scriptPath = createSecureTempScript(generateWindowsScript(), 'installer.ps1');

  const child = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  return child;
}

/**
 * Launch the native installer window
 */
export async function launchNativeWindow(): Promise<FeatureResult> {
  const platform = getPlatform();
  let childProcess: ChildProcess | null = null;

  try {
    switch (platform) {
      case 'linux':
        childProcess = await launchLinuxWindow();
        // Raise the window to the front after a short delay
        if (hasWmctrl()) {
          setTimeout(() => {
            raiseWindow('Package Installation');
          }, 1500);
        }
        break;
      case 'darwin':
        childProcess = await launchMacWindow();
        break;
      case 'win32':
        childProcess = await launchWindowsWindow();
        break;
    }
  } catch (error) {
    console.warn('Failed to launch native window:', error);
  }

  const cleanup: CleanupFn = async () => {
    // Kill the child process
    if (childProcess && !childProcess.killed) {
      try {
        if (platform !== 'win32' && childProcess.pid) {
          // Kill the process group on Unix
          process.kill(-childProcess.pid, 'SIGTERM');
        } else {
          childProcess.kill('SIGTERM');
        }
      } catch {
        // Process may have already exited
      }
    }

    // Clean up temporary files
    cleanupTempFiles();
  };

  return {
    name: 'native-window',
    cleanup,
  };
}
