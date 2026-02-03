import { execSync } from 'node:child_process';
import type { Platform, ScreenDimensions, TerminalConfig } from '../types.js';

/**
 * Validate that a string contains only safe characters for command names
 * Prevents command injection attacks
 */
function isValidCommandName(command: string): boolean {
  // Only allow alphanumeric characters, hyphens, underscores, and dots
  // This is restrictive but covers all legitimate command names
  return /^[a-zA-Z0-9._-]+$/.test(command);
}

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
  return process.platform as Platform;
}

/**
 * Check if running as root/administrator (not recommended)
 */
export function isRunningAsRoot(): boolean {
  if (getPlatform() === 'win32') {
    // On Windows, check for admin privileges is complex and not critical for this app
    return false;
  }
  return process.getuid?.() === 0;
}

/**
 * Check if a command exists on the system
 * @param command - The command name to check (must be alphanumeric with hyphens/underscores only)
 */
export function commandExists(command: string): boolean {
  // Security: Validate command name to prevent injection
  if (!isValidCommandName(command)) {
    console.warn(`Invalid command name: ${command}`);
    return false;
  }

  try {
    const checkCmd = getPlatform() === 'win32' ? `where ${command}` : `which ${command}`;
    execSync(checkCmd, { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get screen dimensions
 */
export function getScreenDimensions(): ScreenDimensions {
  const platform = getPlatform();

  try {
    if (platform === 'linux') {
      // Try xdpyinfo first
      try {
        const output = execSync('xdpyinfo 2>/dev/null | grep dimensions', {
          encoding: 'utf-8',
          timeout: 5000,
        });
        const match = output.match(/(\d+)x(\d+)/);
        if (match) {
          return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
        }
      } catch {}

      // Try xrandr as fallback
      try {
        const output = execSync('xrandr 2>/dev/null | grep "\\*"', {
          encoding: 'utf-8',
          timeout: 5000,
        });
        const match = output.match(/(\d+)x(\d+)/);
        if (match) {
          return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
        }
      } catch {}
    } else if (platform === 'darwin') {
      const output = execSync('system_profiler SPDisplaysDataType 2>/dev/null | grep Resolution', {
        encoding: 'utf-8',
        timeout: 5000,
      });
      const match = output.match(/(\d+)\s*x\s*(\d+)/);
      if (match) {
        return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
      }
    } else if (platform === 'win32') {
      const output = execSync(
        'wmic path Win32_VideoController get CurrentHorizontalResolution,CurrentVerticalResolution /format:csv',
        {
          encoding: 'utf-8',
          timeout: 5000,
        },
      );
      const lines = output.trim().split('\n');
      if (lines.length > 1) {
        const values = lines[1].split(',');
        if (values.length >= 3) {
          return { width: parseInt(values[1], 10), height: parseInt(values[2], 10) };
        }
      }
    }
  } catch {
    // Fall through to default
  }

  // Default fallback
  return { width: 1920, height: 1080 };
}

/**
 * Terminal configurations for different platforms
 * geometryArg uses {cols}, {rows}, {x}, {y} placeholders
 */
const terminalConfigs: Record<Platform, TerminalConfig[]> = {
  linux: [
    {
      command: 'gnome-terminal',
      args: ['--geometry={cols}x{rows}+{x}+{y}', '--', 'bash', '-c', '{cmd}; exec bash'],
      geometryArg: '--geometry={cols}x{rows}+{x}+{y}',
    },
    {
      command: 'konsole',
      args: ['-e', 'bash', '-c', '{cmd}; exec bash'],
      geometryArg: '--geometry={cols}x{rows}+{x}+{y}',
    },
    {
      command: 'xfce4-terminal',
      args: ['--geometry={cols}x{rows}+{x}+{y}', '-e', 'bash -c "{cmd}; exec bash"'],
      geometryArg: '--geometry={cols}x{rows}+{x}+{y}',
    },
    {
      command: 'xterm',
      args: ['-geometry', '{cols}x{rows}+{x}+{y}', '-e', 'bash', '-c', '{cmd}; exec bash'],
      geometryArg: '-geometry {cols}x{rows}+{x}+{y}',
    },
    {
      command: 'terminator',
      args: ['--geometry={width}x{height}+{x}+{y}', '-e', 'bash -c "{cmd}; exec bash"'],
      geometryArg: '--geometry={width}x{height}+{x}+{y}',
    },
    {
      command: 'alacritty',
      args: [
        '-o',
        'window.position.x={x}',
        '-o',
        'window.position.y={y}',
        '-o',
        'window.dimensions.columns={cols}',
        '-o',
        'window.dimensions.lines={rows}',
        '-e',
        'bash',
        '-c',
        '{cmd}; exec bash',
      ],
      geometryArg: 'alacritty-special',
    },
    {
      command: 'kitty',
      args: [
        '-o',
        'initial_window_width={width}',
        '-o',
        'initial_window_height={height}',
        'bash',
        '-c',
        '{cmd}; exec bash',
      ],
      geometryArg: 'kitty-special',
    },
  ],
  darwin: [
    {
      command: 'osascript',
      args: ['-e', 'tell application "Terminal" to do script "{cmd}"'],
    },
    {
      command: 'open',
      args: ['-a', 'iTerm', '--args', '-e', '{cmd}'],
    },
  ],
  win32: [
    { command: 'wt.exe', args: ['--', 'cmd', '/k', '{cmd}'] },
    { command: 'powershell', args: ['-NoExit', '-Command', '{cmd}'] },
    { command: 'cmd', args: ['/k', '{cmd}'] },
  ],
};

/**
 * Detect the available terminal emulator on the current platform
 */
export function detectTerminal(): TerminalConfig | null {
  const platform = getPlatform();
  const configs = terminalConfigs[platform] || [];

  for (const config of configs) {
    if (commandExists(config.command)) {
      return config;
    }
  }

  return null;
}

/**
 * Get the path to the node executable
 */
export function getNodePath(): string {
  return process.execPath;
}

/**
 * Get environment variable cross-platform
 */
export function getEnv(name: string): string | undefined {
  return process.env[name];
}

/**
 * Check if running in a CI environment
 */
export function isCI(): boolean {
  return Boolean(
    process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.CIRCLECI,
  );
}

/**
 * Check if wmctrl is available for window positioning
 */
export function hasWmctrl(): boolean {
  return commandExists('wmctrl');
}

/**
 * Window info from wmctrl
 */
interface WindowInfo {
  id: string;
  title: string;
}

/**
 * List all windows using wmctrl
 */
export function listWindows(): WindowInfo[] {
  if (!hasWmctrl()) {
    return [];
  }

  try {
    const output = execSync('wmctrl -l', {
      encoding: 'utf-8',
      timeout: 5000,
    });

    return output
      .trim()
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split(/\s+/);
        const id = parts[0];
        // Title starts after the third column (id, desktop, host)
        const title = parts.slice(3).join(' ');
        return { id, title };
      });
  } catch {
    return [];
  }
}

/**
 * Move and resize a window by ID using wmctrl
 */
export function moveWindowById(
  windowId: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  if (!hasWmctrl()) {
    return;
  }

  try {
    // -i means use window ID, -e sets geometry: gravity,x,y,width,height
    execSync(`wmctrl -i -r ${windowId} -e 0,${x},${y},${width},${height}`, {
      stdio: 'ignore',
      timeout: 5000,
    });
  } catch {
    // Window positioning failed
  }
}

/**
 * Move and resize a window using wmctrl
 * @param windowMatch - Window name/title to match
 * @param x - X position
 * @param y - Y position
 * @param width - Window width
 * @param height - Window height
 */
export function moveWindow(
  windowMatch: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  if (!hasWmctrl()) {
    return;
  }

  try {
    // -r selects window by name, -e sets geometry: gravity,x,y,width,height
    // gravity 0 means use current gravity
    execSync(`wmctrl -r "${windowMatch}" -e 0,${x},${y},${width},${height}`, {
      stdio: 'ignore',
      timeout: 5000,
    });
  } catch {
    // Window might not exist yet or wmctrl failed
  }
}

/**
 * Bring a window to front by ID
 */
export function raiseWindowById(windowId: string): void {
  if (!hasWmctrl()) {
    return;
  }

  try {
    execSync(`wmctrl -i -a ${windowId}`, {
      stdio: 'ignore',
      timeout: 5000,
    });
  } catch {
    // Window raise failed
  }
}

/**
 * Bring a window to front
 * @param windowMatch - Window name/title to match
 */
export function raiseWindow(windowMatch: string): void {
  if (!hasWmctrl()) {
    return;
  }

  try {
    execSync(`wmctrl -a "${windowMatch}"`, {
      stdio: 'ignore',
      timeout: 5000,
    });
  } catch {
    // Window might not exist yet or wmctrl failed
  }
}

/**
 * Close a window by ID using wmctrl
 */
export function closeWindowById(windowId: string): void {
  if (!hasWmctrl()) {
    return;
  }

  try {
    execSync(`wmctrl -i -c ${windowId}`, {
      stdio: 'ignore',
      timeout: 5000,
    });
  } catch {
    // Window close failed
  }
}

/**
 * Find windows matching any of the given patterns
 */
export function findWindowsByPatterns(patterns: string[]): WindowInfo[] {
  const windows = listWindows();
  return windows.filter((w) =>
    patterns.some((p) => w.title.toLowerCase().includes(p.toLowerCase())),
  );
}
