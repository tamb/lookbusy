#!/usr/bin/env node

import { checkbox } from '@inquirer/prompts';
import { Command } from 'commander';
import { run } from './index.js';
import { createDefaultOptions, type LookbusyOptions, OPTION_DEFINITIONS } from './types.js';

const program = new Command();

program
  .name('lookbusy')
  .description(
    'Make your computer look busy with fake terminal commands, browser dashboards, and more',
  )
  .version('1.0.0')
  .option('--options', 'Show interactive options to select which features to enable')
  .action(async (opts: { options?: boolean }) => {
    let options: LookbusyOptions;

    if (opts.options) {
      options = await showOptionsPrompt();
    } else {
      options = createDefaultOptions();
    }

    // Check if at least one option is enabled
    const anyEnabled = Object.values(options).some(Boolean);
    if (!anyEnabled) {
      console.log('No features selected. Exiting.');
      process.exit(0);
    }

    await run(options);
  });

/**
 * Show interactive checkbox prompt for selecting features
 */
async function showOptionsPrompt(): Promise<LookbusyOptions> {
  const choices = OPTION_DEFINITIONS.map((opt) => ({
    name: `${opt.label} - ${opt.description}`,
    value: opt.key,
    checked: opt.defaultEnabled,
  }));

  const selected = await checkbox({
    message: 'Select features to enable:',
    choices,
  });

  const options: LookbusyOptions = {
    terminalOutput: false,
    spawnTerminal: false,
    browserDashboard: false,
    nativeWindow: false,
    stayAwake: false,
  };

  for (const key of selected) {
    options[key] = true;
  }

  return options;
}

program.parse();
