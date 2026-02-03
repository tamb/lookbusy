import chalk from 'chalk';
import { launchBrowser } from './browser/launcher.js';
import { launchNativeWindow } from './native/window.js';
import { runTerminalOutput } from './terminal/output.js';
import { spawnTerminal } from './terminal/spawner.js';
import type { CleanupFn, FeatureResult, LookbusyOptions } from './types.js';
import { getPlatform, hasWmctrl, isRunningAsRoot } from './utils/platform.js';
import { preventSleep } from './utils/stay-awake.js';

const cleanupFunctions: CleanupFn[] = [];
let isShuttingDown = false;

/**
 * Run ocupado with the specified options
 */
export async function run(options: LookbusyOptions): Promise<void> {
  // Security check: warn if running as root
  if (isRunningAsRoot()) {
    console.log(chalk.yellow('\n⚠️  Warning: Running as root is not recommended.'));
    console.log(chalk.yellow('   ocupado does not require elevated privileges.\n'));
  }

  // Check for wmctrl on Linux when using grid layout
  if (options.gridLayout && getPlatform() === 'linux' && !hasWmctrl()) {
    console.log(chalk.yellow('\n⚠️  Warning: wmctrl is not installed.'));
    console.log(chalk.yellow('   Window positioning for --grid layout requires wmctrl.'));
    console.log(chalk.yellow('   Install it with: sudo apt install wmctrl\n'));
  }

  // Register cleanup handlers first
  registerCleanupHandlers();

  console.log(chalk.bold.cyan('\n🚀 Starting ocupado...\n'));

  const features: FeatureResult[] = [];

  try {
    // Start stay awake first if enabled
    if (options.stayAwake) {
      const result = await preventSleep();
      features.push(result);
      cleanupFunctions.push(result.cleanup);
      console.log(`${chalk.green('✓')} Stay awake enabled`);
    }

    // Launch browser dashboard
    if (options.browserDashboard) {
      console.log(chalk.dim('  Launching browser...'));
      const result = await launchBrowser(options.gridLayout);
      features.push(result);
      cleanupFunctions.push(result.cleanup);
      console.log(`${chalk.green('✓')} Browser dashboard launched`);
    }

    // Spawn additional terminals (spawn before native window so native appears on top)
    if (options.spawnTerminal) {
      const result = await spawnTerminal(options.gridLayout);
      features.push(result);
      cleanupFunctions.push(result.cleanup);
      console.log(`${chalk.green('✓')} Additional terminals spawned`);
    }

    // Launch native window (last so it appears on top)
    if (options.nativeWindow) {
      const result = await launchNativeWindow();
      features.push(result);
      cleanupFunctions.push(result.cleanup);
      console.log(`${chalk.green('✓')} Native installer window launched`);
    }

    // Start terminal output (this runs in the main terminal and blocks)
    if (options.terminalOutput) {
      console.log(`${chalk.green('✓')} Terminal output starting...\n`);
      console.log(chalk.dim('─'.repeat(50)));
      console.log(chalk.dim('Press Ctrl+C to stop\n'));
      await runTerminalOutput();
    } else {
      // If no terminal output, just wait for Ctrl+C
      console.log(chalk.dim(`\n${'─'.repeat(50)}`));
      console.log(chalk.dim('Press Ctrl+C to stop\n'));
      await waitForever();
    }
  } catch (error) {
    if (!isShuttingDown) {
      console.error(chalk.red('Error running ocupado:'), error);
      await shutdown();
      process.exit(1);
    }
  }
}

/**
 * Wait indefinitely (for when terminal output is disabled)
 */
function waitForever(): Promise<never> {
  return new Promise(() => {
    // Never resolves, waits for SIGINT/SIGTERM
  });
}

/**
 * Cleanup all running features
 */
export async function shutdown(): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(chalk.yellow('\n\nCleaning up...'));

  const cleanupPromises = cleanupFunctions.map(async (cleanup) => {
    try {
      await cleanup();
    } catch {
      // Ignore cleanup errors
    }
  });

  await Promise.all(cleanupPromises);
  cleanupFunctions.length = 0;

  console.log(chalk.cyan('Goodbye! 👋\n'));
}

/**
 * Register process cleanup handlers (only once)
 */
let handlersRegistered = false;
function registerCleanupHandlers(): void {
  if (handlersRegistered) {
    return;
  }
  handlersRegistered = true;

  process.on('SIGINT', async () => {
    await shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    console.error(chalk.red('Uncaught exception:'), error);
    await shutdown();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason) => {
    console.error(chalk.red('Unhandled rejection:'), reason);
    await shutdown();
    process.exit(1);
  });
}
