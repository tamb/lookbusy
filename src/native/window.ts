import { type ChildProcess, spawn } from 'node:child_process';
import { chmodSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CleanupFn, FeatureResult } from '../types.js';
import { commandExists, getPlatform } from '../utils/platform.js';

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
 * Installation phases for more realistic busy appearance
 */
const installPhases = [
  { name: 'Resolving dependencies', duration: 8 },
  { name: 'Downloading packages', duration: 15 },
  { name: 'Installing packages', duration: 25 },
  { name: 'Building native modules', duration: 12 },
  { name: 'Linking dependencies', duration: 8 },
  { name: 'Running postinstall scripts', duration: 10 },
  { name: 'Optimizing bundle', duration: 12 },
  { name: 'Generating types', duration: 8 },
  { name: 'Running tests', duration: 15 },
  { name: 'Building for production', duration: 20 },
  { name: 'Compressing assets', duration: 8 },
  { name: 'Finalizing deployment', duration: 10 },
];

/**
 * Generate a shell script for Linux that shows a fake installer progress
 * Runs indefinitely through multiple phases with varied timing
 */
function generateLinuxScript(): string {
  // Generate file installation commands with varied timing (0.3-0.8s per file)
  const fileCommands = installFiles
    .map((f, i) => {
      const delay = (0.3 + (i % 5) * 0.1).toFixed(1);
      const progress = Math.floor((i / installFiles.length) * 60) + 10; // 10-70% range
      return `echo "${progress}"\necho "# Installing: ${f}"\nsleep ${delay}`;
    })
    .join('\n');

  // Generate phase commands
  const phaseScript = installPhases
    .map((phase, i) => {
      const baseProgress = Math.floor((i / installPhases.length) * 100);
      return `
    echo "${baseProgress}"
    echo "# ${phase.name}..."
    for j in $(seq 1 ${phase.duration}); do
      progress=$((${baseProgress} + j * ${Math.floor(100 / installPhases.length / phase.duration)}))
      echo "$progress"
      sleep 0.5
    done`;
    })
    .join('\n');

  return `#!/bin/bash

run_installation() {
  (
    echo "0"
    echo "# Preparing installation environment..."
    sleep 2
    
    echo "2"
    echo "# Checking system requirements..."
    sleep 1.5
    
    echo "5"
    echo "# Resolving dependency tree..."
    sleep 2
    
    echo "8"
    echo "# Fetching package metadata..."
    sleep 1.5
    
    ${fileCommands}
    
    echo "75"
    echo "# Compiling TypeScript..."
    sleep 3
    
    echo "80"
    echo "# Building native modules..."
    sleep 2.5
    
    echo "85"
    echo "# Running postinstall hooks..."
    sleep 2
    
    echo "90"
    echo "# Optimizing bundles..."
    sleep 2
    
    echo "95"
    echo "# Generating sourcemaps..."
    sleep 1.5
    
    echo "98"
    echo "# Cleaning up..."
    sleep 1
    
    echo "100"
    echo "# Phase complete!"
    sleep 1
  ) | zenity --progress \\
    --title="Package Installation - Phase $1" \\
    --text="Starting installation..." \\
    --percentage=0 \\
    --no-cancel \\
    --width=550 \\
    --height=150 2>/dev/null
}

run_config_phase() {
  (
    ${phaseScript}
    
    echo "100"
    echo "# Configuration complete!"
    sleep 1
  ) | zenity --progress \\
    --title="Build Configuration - Cycle $1" \\
    --text="Configuring build..." \\
    --percentage=0 \\
    --no-cancel \\
    --width=550 \\
    --height=150 2>/dev/null
}

run_pulsate_phase() {
  local titles=("Post-Install Scripts" "Dependency Verification" "Cache Optimization" "Index Rebuilding" "Type Checking" "Lint Analysis")
  local texts=("Running post-install scripts..." "Verifying dependency integrity..." "Optimizing module cache..." "Rebuilding search indices..." "Running type checker..." "Analyzing code quality...")
  local idx=$((($1 - 1) % 6))
  
  zenity --progress \\
    --title="\${titles[$idx]}" \\
    --text="\${texts[$idx]}" \\
    --pulsate \\
    --no-cancel \\
    --width=500 \\
    --height=150 \\
    --timeout=20 2>/dev/null
}

# Main loop - cycles through different installation phases indefinitely
cycle=1
while true; do
  run_installation $cycle
  sleep 0.5
  run_config_phase $cycle
  sleep 0.5
  run_pulsate_phase $cycle
  sleep 0.5
  cycle=$((cycle + 1))
done
`;
}

/**
 * Generate a shell script for Linux using yad (alternative to zenity)
 */
function generateLinuxYadScript(): string {
  const fileCommands = installFiles
    .map((f, i) => {
      const delay = (0.3 + (i % 5) * 0.1).toFixed(1);
      const progress = Math.floor((i / installFiles.length) * 80) + 5;
      return `echo "${progress}"\necho "# Installing: ${f}"\nsleep ${delay}`;
    })
    .join('\n');

  return `#!/bin/bash

run_yad_installation() {
  (
    echo "0"
    echo "# Preparing installation..."
    sleep 2
    
    echo "3"
    echo "# Resolving dependencies..."
    sleep 1.5
    
    ${fileCommands}
    
    echo "88"
    echo "# Compiling modules..."
    sleep 2
    
    echo "94"
    echo "# Running post-install..."
    sleep 1.5
    
    echo "100"
    echo "# Complete!"
    sleep 1
  ) | yad --progress \\
    --title="Package Installation - Phase $1" \\
    --text="Starting installation..." \\
    --percentage=0 \\
    --width=500 \\
    --height=120 \\
    --no-buttons 2>/dev/null
}

run_yad_pulsate() {
  local titles=("Post-Install Scripts" "Dependency Check" "Cache Optimization" "Type Checking")
  local texts=("Running post-install scripts..." "Verifying dependencies..." "Optimizing cache..." "Running type checker...")
  local idx=$((($1 - 1) % 4))
  
  yad --progress \\
    --title="\${titles[$idx]}" \\
    --text="\${texts[$idx]}" \\
    --pulsate \\
    --width=450 \\
    --height=100 \\
    --no-buttons \\
    --timeout=25 2>/dev/null
}

cycle=1
while true; do
  run_yad_installation $cycle
  sleep 0.5
  run_yad_pulsate $cycle
  sleep 0.5
  cycle=$((cycle + 1))
done
`;
}

/**
 * Generate AppleScript for macOS native progress dialog
 * Shows rotating messages for a busier appearance
 */
function generateMacScript(): string {
  return `
set phaseMessages to {"Resolving dependency tree...", "Downloading packages from registry...", "Installing node_modules...", "Building native modules...", "Linking dependencies...", "Running postinstall scripts...", "Compiling TypeScript...", "Optimizing bundle size...", "Generating type definitions...", "Running test suite...", "Building for production...", "Compressing assets...", "Verifying checksums...", "Updating lockfile...", "Cleaning cache..."}

set detailMessages to {"This may take several minutes", "Processing 847 packages", "Compiling 234 modules", "Analyzing 156 dependencies", "Running 89 scripts", "Checking 1,247 types", "Optimizing 67 chunks"}

set phaseIndex to 1
set detailIndex to 1

tell application "System Events"
  repeat
    set currentPhase to item phaseIndex of phaseMessages
    set currentDetail to item detailIndex of detailMessages
    
    display dialog currentPhase & return & return & currentDetail buttons {"Working..."} giving up after 8 with title "Package Installation" with icon note
    
    set phaseIndex to (phaseIndex mod (count of phaseMessages)) + 1
    set detailIndex to (detailIndex mod (count of detailMessages)) + 1
    
    delay 0.5
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
$statsLabel.Size = New-Object System.Drawing.Size(520, 20)
$statsLabel.Text = "Packages: 0 | Elapsed: 0:00"
$statsLabel.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$statsLabel.ForeColor = [System.Drawing.Color]::Gray
$form.Controls.Add($statsLabel)

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
  const tempDir = mkdtempSync(join(tmpdir(), 'lookbusy-'));
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
