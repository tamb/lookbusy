import chalk from 'chalk';
import { launchBrowser } from './browser/launcher.js';
import { launchNativeWindow } from './native/window.js';
import { runTerminalOutput } from './terminal/output.js';
import { spawnTerminal } from './terminal/spawner.js';
import type { CleanupFn, FeatureResult, LookbusyOptions } from './types.js';
import { isRunningAsRoot } from './utils/platform.js';
import { preventSleep } from './utils/stay-awake.js';

const cleanupFunctions: CleanupFn[] = [];
let isShuttingDown = false;

/**
 * Run lookbusy with the specified options
 */
export async function run(options: LookbusyOptions): Promise<void> {
  // Security check: warn if running as root
  if (isRunningAsRoot()) {
    console.log(chalk.yellow('\n⚠️  Warning: Running as root is not recommended.'));
    console.log(chalk.yellow('   lookbusy does not require elevated privileges.\n'));
  }

  // Register cleanup handlers first
  registerCleanupHandlers();

  console.log(chalk.bold.cyan('\n🚀 Starting lookbusy...\n'));

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
      const result = await launchBrowser();
      features.push(result);
      cleanupFunctions.push(result.cleanup);
      console.log(`${chalk.green('✓')} Browser dashboard launched`);
    }

    // Launch native window
    if (options.nativeWindow) {
      const result = await launchNativeWindow();
      features.push(result);
      cleanupFunctions.push(result.cleanup);
      console.log(`${chalk.green('✓')} Native installer window launched`);
    }

    // Spawn additional terminal
    if (options.spawnTerminal) {
      const result = await spawnTerminal();
      features.push(result);
      cleanupFunctions.push(result.cleanup);
      console.log(`${chalk.green('✓')} Additional terminal spawned`);
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
      console.error(chalk.red('Error running lookbusy:'), error);
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
