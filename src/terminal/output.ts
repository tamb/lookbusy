import chalk from 'chalk';
import cliProgress from 'cli-progress';
import ora, { type Ora } from 'ora';
import type { FakeCommand, OutputLine, OutputStyle } from '../types.js';
import { getAllCommands, getRandomCommand } from './commands.js';

/**
 * Map output styles to chalk functions
 */
const styleMap: Record<OutputStyle, (text: string) => string> = {
  default: (text) => text,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.dim,
  bold: chalk.bold,
  cyan: chalk.cyan,
  magenta: chalk.magenta,
  yellow: chalk.yellow,
  green: chalk.green,
  red: chalk.red,
  blue: chalk.blue,
};

/**
 * Apply style to text
 */
export function applyStyle(text: string, style?: OutputStyle): string {
  const styleFn = style ? styleMap[style] : styleMap.default;
  return styleFn(text);
}

/**
 * Render a single output line to the console
 */
export function renderLine(line: OutputLine): void {
  const styledText = applyStyle(line.text, line.style);

  if (line.replacePrevious) {
    // Move cursor up and clear line
    process.stdout.write('\x1b[1A\x1b[2K');
  }

  console.log(styledText);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a spinner with the specified text
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
  });
}

/**
 * Create a progress bar
 */
export function createProgressBar(
  total: number,
  label: string = 'Progress',
): cliProgress.SingleBar {
  const bar = new cliProgress.SingleBar({
    format: `${chalk.cyan(label)} |{bar}| {percentage}% | {value}/{total}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });

  bar.start(total, 0);
  return bar;
}

/**
 * Run a single fake command and display its output
 */
export async function runCommand(command: FakeCommand): Promise<void> {
  const generator = command.output();

  for await (const line of generator) {
    if (line.delay) {
      await sleep(line.delay);
    }
    renderLine(line);
  }
}

/**
 * Run commands in sequence, randomly selecting from available commands
 */
export async function runCommandSequence(
  commands: FakeCommand[],
  options: { loop?: boolean; delayBetween?: number } = {},
): Promise<void> {
  const { loop = true, delayBetween = 1000 } = options;

  do {
    // Shuffle commands for variety
    const shuffled = [...commands].sort(() => Math.random() - 0.5);

    for (const command of shuffled) {
      await runCommand(command);
      await sleep(delayBetween);
    }
  } while (loop);
}

/**
 * Main terminal output loop - runs indefinitely displaying fake commands
 */
export async function runTerminalOutput(): Promise<void> {
  const _commands = getAllCommands();

  // Run commands in a loop
  while (true) {
    const command = getRandomCommand();
    await runCommand(command);

    // Random delay between commands
    await sleep(500 + Math.random() * 1500);
  }
}

/**
 * Display a fake loading sequence with spinner
 */
export async function displayLoadingSequence(
  steps: string[],
  delayMs: number = 1000,
): Promise<void> {
  for (const step of steps) {
    const spinner = createSpinner(step);
    spinner.start();

    await sleep(delayMs + Math.random() * delayMs);

    spinner.succeed(step);
  }
}

/**
 * Display a fake progress sequence
 */
export async function displayProgressSequence(
  label: string,
  total: number,
  stepDelayMs: number = 100,
): Promise<void> {
  const bar = createProgressBar(total, label);

  for (let i = 0; i <= total; i++) {
    bar.update(i);
    await sleep(stepDelayMs + Math.random() * stepDelayMs);
  }

  bar.stop();
}
