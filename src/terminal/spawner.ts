import { type ChildProcess, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CleanupFn, FeatureResult } from '../types.js';
import { detectTerminal, getNodePath, getPlatform } from '../utils/platform.js';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create a script that will run fake terminal output
 */
function getTerminalScript(): string {
  const nodePath = getNodePath();
  // Point to the spawned terminal script in the dist folder
  const scriptPath = join(__dirname, '..', 'spawned-terminal.js');

  // Escape paths for different platforms
  const platform = getPlatform();
  if (platform === 'win32') {
    return `"${nodePath}" "${scriptPath}"`;
  }
  return `"${nodePath}" "${scriptPath}"`;
}

/**
 * Spawn a new terminal window running fake commands
 */
export async function spawnTerminal(): Promise<FeatureResult> {
  const terminalConfig = detectTerminal();

  if (!terminalConfig) {
    console.warn('No terminal emulator detected. Skipping terminal spawn.');
    return {
      name: 'terminal-spawner',
      cleanup: async () => {},
    };
  }

  const script = getTerminalScript();

  // Replace {cmd} placeholder with the actual command
  const args = terminalConfig.args.map((arg) => arg.replace('{cmd}', script));

  let childProcess: ChildProcess | null = null;

  try {
    childProcess = spawn(terminalConfig.command, args, {
      detached: true,
      stdio: 'ignore',
    });

    // Don't wait for the child process
    childProcess.unref();
  } catch (error) {
    console.warn('Failed to spawn terminal:', error);
  }

  const cleanup: CleanupFn = async () => {
    if (childProcess && !childProcess.killed) {
      try {
        // Try to kill the process group on Unix
        if (getPlatform() !== 'win32' && childProcess.pid) {
          process.kill(-childProcess.pid, 'SIGTERM');
        } else {
          childProcess.kill('SIGTERM');
        }
      } catch {
        // Process may have already exited
      }
    }
  };

  return {
    name: 'terminal-spawner',
    cleanup,
  };
}
