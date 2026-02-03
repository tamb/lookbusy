import { type ChildProcess, spawn } from 'node:child_process';
import { chmodSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CleanupFn, FeatureResult } from '../types.js';
import { commandExists, getPlatform } from '../utils/platform.js';

// Track temp directories for cleanup
const tempDirs: string[] = [];

/**
 * Files to simulate installing
 */
const installFiles = [
  'node_modules/@types/node/index.d.ts',
  'node_modules/typescript/lib/typescript.js',
  'node_modules/react/cjs/react.production.min.js',
  'node_modules/webpack/lib/webpack.js',
  'dist/main.bundle.js',
  'dist/vendor.bundle.js',
  'dist/styles.css',
  'dist/assets/logo.png',
  'dist/assets/icons/favicon.ico',
  'public/index.html',
  'src/components/App.tsx',
  'src/components/Header.tsx',
  'src/utils/api.ts',
  'src/hooks/useAuth.ts',
  'config/webpack.config.js',
  'config/jest.config.js',
  '.env.production',
  'package.json',
  'tsconfig.json',
  'README.md',
];

/**
 * Generate a shell script for Linux that shows a fake installer progress
 */
function generateLinuxScript(): string {
  const files = installFiles.map((f) => `echo "# Installing: ${f}"; sleep 0.3`).join('\n');

  return `#!/bin/bash
(
  echo "0"
  echo "# Preparing installation..."
  sleep 1
  
  ${files}
  
  echo "95"
  echo "# Finalizing..."
  sleep 1
  
  echo "100"
  echo "# Installation complete!"
  sleep 2
) | zenity --progress \\
  --title="Package Installation" \\
  --text="Starting installation..." \\
  --percentage=0 \\
  --auto-close \\
  --width=500 \\
  --height=150 2>/dev/null

# Keep showing a pulsating progress after completion
while true; do
  zenity --progress \\
    --title="Post-Install Configuration" \\
    --text="Running post-install scripts..." \\
    --pulsate \\
    --auto-close \\
    --width=500 \\
    --height=150 \\
    --timeout=30 2>/dev/null
done
`;
}

/**
 * Generate a shell script for Linux using yad (alternative to zenity)
 */
function generateLinuxYadScript(): string {
  return `#!/bin/bash
while true; do
  yad --progress \\
    --title="Package Installation" \\
    --text="Installing dependencies..." \\
    --pulsate \\
    --auto-close \\
    --width=400 \\
    --height=100 \\
    --timeout=30 2>/dev/null
done
`;
}

/**
 * Generate AppleScript for macOS native progress dialog
 */
function generateMacScript(): string {
  return `
tell application "System Events"
  repeat
    display dialog "Installing packages..." & return & return & "Please wait while dependencies are being installed..." buttons {"Cancel"} giving up after 30 with title "Package Installation" with icon note
    delay 1
  end repeat
end tell
`;
}

/**
 * Generate PowerShell script for Windows native progress dialog
 */
function generateWindowsScript(): string {
  return `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Package Installation"
$form.Size = New-Object System.Drawing.Size(500, 200)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(20, 20)
$label.Size = New-Object System.Drawing.Size(450, 30)
$label.Text = "Installing dependencies..."
$label.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$form.Controls.Add($label)

$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(20, 60)
$progressBar.Size = New-Object System.Drawing.Size(440, 25)
$progressBar.Style = "Marquee"
$progressBar.MarqueeAnimationSpeed = 30
$form.Controls.Add($progressBar)

$fileLabel = New-Object System.Windows.Forms.Label
$fileLabel.Location = New-Object System.Drawing.Point(20, 100)
$fileLabel.Size = New-Object System.Drawing.Size(450, 20)
$fileLabel.ForeColor = [System.Drawing.Color]::Gray
$fileLabel.Font = New-Object System.Drawing.Font("Consolas", 8)
$form.Controls.Add($fileLabel)

$files = @(
  "node_modules/@types/node/index.d.ts",
  "node_modules/typescript/lib/typescript.js",
  "node_modules/react/cjs/react.production.min.js",
  "dist/main.bundle.js",
  "src/components/App.tsx"
)

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 500
$script:fileIndex = 0
$timer.Add_Tick({
  $fileLabel.Text = "Installing: " + $files[$script:fileIndex % $files.Count]
  $script:fileIndex++
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
