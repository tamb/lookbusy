#!/usr/bin/env node

/**
 * This script runs in spawned terminal windows
 * It displays fake commands continuously until the window is closed
 */

import chalk from 'chalk';
import { runTerminalOutput } from './terminal/output.js';

console.log(chalk.bold.cyan('\n🔧 Build & Deploy Terminal\n'));
console.log(chalk.dim('─'.repeat(50)));
console.log(chalk.dim('Running automated tasks...\n'));

// Run the terminal output loop
runTerminalOutput().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
