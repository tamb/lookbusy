import { type ChildProcess, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CleanupFn, FeatureResult, WindowGeometry } from '../types.js';
import {
  closeWindowById,
  detectTerminal,
  getNodePath,
  getPlatform,
  getScreenDimensions,
  hasWmctrl,
  listWindows,
  moveWindowById,
  raiseWindowById,
} from '../utils/platform.js';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create a script that will run fake terminal output
 */
function getTerminalScript(): string {
  const nodePath = getNodePath();
  // Point to the spawned terminal script in the dist folder
  // Note: tsup bundles everything flat into dist/, so spawned-terminal.js is in the same directory
  const scriptPath = join(__dirname, 'spawned-terminal.js');

  // Escape paths for different platforms
  const platform = getPlatform();
  if (platform === 'win32') {
    return `"${nodePath}" "${scriptPath}"`;
  }
  return `"${nodePath}" "${scriptPath}"`;
}

/**
 * Convert pixel dimensions to terminal columns/rows (approximate)
 */
function pixelsToTerminalSize(width: number, height: number): { cols: number; rows: number } {
  // Approximate: 8 pixels per character width, 16 pixels per line height
  const cols = Math.floor(width / 8);
  const rows = Math.floor(height / 16);
  return { cols: Math.max(cols, 40), rows: Math.max(rows, 10) };
}

/**
 * Spawn a single terminal at a specific position
 */
async function spawnSingleTerminal(geometry?: WindowGeometry): Promise<ChildProcess | null> {
  const terminalConfig = detectTerminal();

  if (!terminalConfig) {
    return null;
  }

  const script = getTerminalScript();

  let args = [...terminalConfig.args];

  // Apply geometry if provided and supported
  if (geometry && getPlatform() === 'linux') {
    const { cols, rows } = pixelsToTerminalSize(geometry.width, geometry.height);

    args = args.map((arg) => {
      return arg
        .replace('{cmd}', script)
        .replace('{cols}', String(cols))
        .replace('{rows}', String(rows))
        .replace('{x}', String(geometry.x))
        .replace('{y}', String(geometry.y))
        .replace('{width}', String(geometry.width))
        .replace('{height}', String(geometry.height));
    });
  } else {
    args = args.map((arg) => arg.replace('{cmd}', script));
  }

  try {
    const childProcess = spawn(terminalConfig.command, args, {
      detached: true,
      stdio: 'ignore',
    });

    childProcess.unref();
    return childProcess;
  } catch {
    return null;
  }
}

/**
 * Spawn two terminal windows
 * @param gridLayout - If true, position in stacked quarters on right; if false, smaller floating windows
 */
export async function spawnTerminal(gridLayout = false): Promise<FeatureResult> {
  const terminalConfig = detectTerminal();

  if (!terminalConfig) {
    console.warn('No terminal emulator detected. Skipping terminal spawn.');
    return {
      name: 'terminal-spawner',
      cleanup: async () => {},
    };
  }

  const screen = getScreenDimensions();
  const childProcesses: ChildProcess[] = [];
  const spawnedWindowIds: string[] = []; // Track window IDs for cleanup

  let term1Geometry: WindowGeometry;
  let term2Geometry: WindowGeometry;

  if (gridLayout) {
    // Grid layout: Terminals in stacked quarters on right side
    term1Geometry = {
      x: Math.floor(screen.width / 2),
      y: 0,
      width: Math.floor(screen.width / 2),
      height: Math.floor(screen.height / 2),
    };
    term2Geometry = {
      x: Math.floor(screen.width / 2),
      y: Math.floor(screen.height / 2),
      width: Math.floor(screen.width / 2),
      height: Math.floor(screen.height / 2),
    };
  } else {
    // Fullscreen layout: Smaller floating terminals positioned on top of browser
    const termWidth = Math.floor(screen.width * 0.4);
    const termHeight = Math.floor(screen.height * 0.35);

    // Terminal 1: Top-left area
    term1Geometry = {
      x: 50,
      y: 50,
      width: termWidth,
      height: termHeight,
    };
    // Terminal 2: Bottom-right area
    term2Geometry = {
      x: screen.width - termWidth - 50,
      y: screen.height - termHeight - 100,
      width: termWidth,
      height: termHeight,
    };
  }

  // Terminal window title patterns to match
  const terminalPatterns = [
    'terminal',
    'konsole',
    'xterm',
    'terminator',
    'alacritty',
    'kitty',
    'bash',
    'zsh',
    'fish',
  ];

  try {
    // Get existing windows before spawning
    const windowsBefore = getPlatform() === 'linux' && hasWmctrl() ? listWindows() : [];
    const windowIdsBefore = new Set(windowsBefore.map((w) => w.id));

    const proc1 = await spawnSingleTerminal(term1Geometry);
    if (proc1) childProcesses.push(proc1);

    // Wait for first terminal to appear
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Find and position the first new terminal window
    if (getPlatform() === 'linux' && hasWmctrl()) {
      const windowsAfterFirst = listWindows();
      const newWindows1 = windowsAfterFirst.filter(
        (w) =>
          !windowIdsBefore.has(w.id) &&
          terminalPatterns.some((p) => w.title.toLowerCase().includes(p)),
      );
      if (newWindows1.length > 0) {
        spawnedWindowIds.push(newWindows1[0].id); // Track for cleanup
        moveWindowById(
          newWindows1[0].id,
          term1Geometry.x,
          term1Geometry.y,
          term1Geometry.width,
          term1Geometry.height,
        );
      }
    }

    // Track windows again before second terminal
    const windowsBeforeSecond = getPlatform() === 'linux' && hasWmctrl() ? listWindows() : [];
    const windowIdsBeforeSecond = new Set(windowsBeforeSecond.map((w) => w.id));

    const proc2 = await spawnSingleTerminal(term2Geometry);
    if (proc2) childProcesses.push(proc2);

    // Wait for second terminal to appear and position it
    if (getPlatform() === 'linux' && hasWmctrl()) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const windowsAfterSecond = listWindows();
      const newWindows2 = windowsAfterSecond.filter(
        (w) =>
          !windowIdsBeforeSecond.has(w.id) &&
          terminalPatterns.some((p) => w.title.toLowerCase().includes(p)),
      );
      if (newWindows2.length > 0) {
        spawnedWindowIds.push(newWindows2[0].id); // Track for cleanup
        moveWindowById(
          newWindows2[0].id,
          term2Geometry.x,
          term2Geometry.y,
          term2Geometry.width,
          term2Geometry.height,
        );
        // Raise second terminal to be on top
        raiseWindowById(newWindows2[0].id);
      }
    }
  } catch (error) {
    console.warn('Failed to spawn terminals:', error);
  }

  const cleanup: CleanupFn = async () => {
    // First, try to close windows by ID using wmctrl (most reliable on Linux)
    if (getPlatform() === 'linux' && hasWmctrl()) {
      for (const windowId of spawnedWindowIds) {
        closeWindowById(windowId);
      }
    }

    // Also try to kill the child processes
    for (const childProcess of childProcesses) {
      if (childProcess && !childProcess.killed) {
        try {
          if (getPlatform() !== 'win32' && childProcess.pid) {
            process.kill(-childProcess.pid, 'SIGTERM');
          } else {
            childProcess.kill('SIGTERM');
          }
        } catch {
          // Process may have already exited
        }
      }
    }
  };

  return {
    name: 'terminal-spawner',
    cleanup,
  };
}
