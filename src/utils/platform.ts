import { execSync } from 'node:child_process';
import type { Platform, TerminalConfig } from '../types.js';

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
 * Terminal configurations for different platforms
 */
const terminalConfigs: Record<Platform, TerminalConfig[]> = {
  linux: [
    { command: 'gnome-terminal', args: ['--', 'bash', '-c', '{cmd}; exec bash'] },
    { command: 'konsole', args: ['-e', 'bash', '-c', '{cmd}; exec bash'] },
    { command: 'xfce4-terminal', args: ['-e', 'bash -c "{cmd}; exec bash"'] },
    { command: 'xterm', args: ['-e', 'bash', '-c', '{cmd}; exec bash'] },
    { command: 'terminator', args: ['-e', 'bash -c "{cmd}; exec bash"'] },
    { command: 'alacritty', args: ['-e', 'bash', '-c', '{cmd}; exec bash'] },
    { command: 'kitty', args: ['bash', '-c', '{cmd}; exec bash'] },
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
