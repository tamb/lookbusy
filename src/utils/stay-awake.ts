import { type ChildProcess, exec, spawn } from 'node:child_process';
import type { CleanupFn, FeatureResult } from '../types.js';
import { commandExists, getPlatform } from './platform.js';

/**
 * Prevent sleep on Linux using various methods
 */
async function preventSleepLinux(): Promise<{ cleanup: CleanupFn }> {
  let intervalId: NodeJS.Timeout | null = null;
  let childProcess: ChildProcess | null = null;

  // Method 1: Use xdg-screensaver reset periodically
  if (commandExists('xdg-screensaver')) {
    intervalId = setInterval(() => {
      exec('xdg-screensaver reset', () => {});
    }, 30000); // Every 30 seconds

    // Reset immediately
    exec('xdg-screensaver reset', () => {});

    return {
      cleanup: async () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      },
    };
  }

  // Method 2: Use caffeine if available
  if (commandExists('caffeine')) {
    childProcess = spawn('caffeine', [], {
      detached: true,
      stdio: 'ignore',
    });
    childProcess.unref();

    return {
      cleanup: async () => {
        if (childProcess && !childProcess.killed) {
          childProcess.kill('SIGTERM');
        }
      },
    };
  }

  // Method 3: Use xset to disable DPMS and screensaver
  if (commandExists('xset')) {
    // Disable screen saver
    exec('xset s off', () => {});
    exec('xset -dpms', () => {});

    // Keep refreshing to prevent sleep
    intervalId = setInterval(() => {
      exec('xset s reset', () => {});
    }, 30000);

    return {
      cleanup: async () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        // Re-enable screen saver (default settings)
        exec('xset s on', () => {});
        exec('xset +dpms', () => {});
      },
    };
  }

  // Method 4: Use gnome-session-inhibit if available
  if (commandExists('gnome-session-inhibit')) {
    childProcess = spawn(
      'gnome-session-inhibit',
      ['--inhibit', 'idle', '--reason', 'belazy is running', 'sleep', 'infinity'],
      {
        detached: true,
        stdio: 'ignore',
      },
    );
    childProcess.unref();

    return {
      cleanup: async () => {
        if (childProcess && !childProcess.killed) {
          try {
            if (childProcess.pid) {
              process.kill(-childProcess.pid, 'SIGTERM');
            }
          } catch {
            childProcess.kill('SIGTERM');
          }
        }
      },
    };
  }

  // No method available
  console.warn('No method available to prevent sleep on this Linux system');
  return { cleanup: async () => {} };
}

/**
 * Prevent sleep on macOS using caffeinate
 */
async function preventSleepMac(): Promise<{ cleanup: CleanupFn }> {
  // caffeinate -d prevents display sleep
  // caffeinate -i prevents idle sleep
  const childProcess = spawn('caffeinate', ['-d', '-i'], {
    detached: true,
    stdio: 'ignore',
  });
  childProcess.unref();

  return {
    cleanup: async () => {
      if (childProcess && !childProcess.killed) {
        childProcess.kill('SIGTERM');
      }
    },
  };
}

/**
 * Prevent sleep on Windows using PowerShell
 */
async function preventSleepWindows(): Promise<{ cleanup: CleanupFn }> {
  let intervalId: NodeJS.Timeout | null = null;

  // Use PowerShell to call SetThreadExecutionState periodically
  const _preventSleep = () => {
    exec(
      `powershell -Command "[System.Runtime.InteropServices.Marshal]::GetDelegateForFunctionPointer([Win32.NativeMethods]::SetThreadExecutionState, [Func[uint, uint]]).Invoke(0x80000003)"`,
      () => {},
    );
  };

  // Alternative: Use simpler approach with mouse move simulation
  const keepAwake = () => {
    // This PowerShell command sends an F15 key press which keeps the system awake
    // F15 is rarely used and shouldn't interfere with anything
    exec(
      `powershell -Command "$wsh = New-Object -ComObject WScript.Shell; $wsh.SendKeys('{F15}')"`,
      () => {},
    );
  };

  // Run immediately and then every 30 seconds
  keepAwake();
  intervalId = setInterval(keepAwake, 30000);

  return {
    cleanup: async () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  };
}

/**
 * Prevent the computer from sleeping
 */
export async function preventSleep(): Promise<FeatureResult> {
  const platform = getPlatform();
  let result: { cleanup: CleanupFn };

  try {
    switch (platform) {
      case 'linux':
        result = await preventSleepLinux();
        break;
      case 'darwin':
        result = await preventSleepMac();
        break;
      case 'win32':
        result = await preventSleepWindows();
        break;
      default:
        console.warn(`Stay awake not supported on platform: ${platform}`);
        result = { cleanup: async () => {} };
    }
  } catch (error) {
    console.warn('Failed to enable stay awake:', error);
    result = { cleanup: async () => {} };
  }

  return {
    name: 'stay-awake',
    cleanup: result.cleanup,
  };
}

/**
 * Check if stay awake is supported on this platform
 */
export function isStayAwakeSupported(): boolean {
  const platform = getPlatform();

  switch (platform) {
    case 'linux':
      return (
        commandExists('xdg-screensaver') ||
        commandExists('caffeine') ||
        commandExists('xset') ||
        commandExists('gnome-session-inhibit')
      );
    case 'darwin':
      return commandExists('caffeinate');
    case 'win32':
      return commandExists('powershell');
    default:
      return false;
  }
}
