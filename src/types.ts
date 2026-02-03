/**
 * Configuration options for lookbusy features
 */
export interface LookbusyOptions {
  /** Enable fake terminal output with spinners and progress bars */
  terminalOutput: boolean;
  /** Spawn an additional terminal window */
  spawnTerminal: boolean;
  /** Launch a browser with a fake dashboard */
  browserDashboard: boolean;
  /** Show a native installer window */
  nativeWindow: boolean;
  /** Prevent the screen from sleeping */
  stayAwake: boolean;
}

/**
 * A fake command that can be displayed in the terminal
 */
export interface FakeCommand {
  /** Display name of the command */
  name: string;
  /** Generator function that yields output lines */
  output: () => AsyncGenerator<OutputLine, void, unknown>;
  /** Approximate duration in milliseconds */
  duration: number;
}

/**
 * A single line of terminal output with styling
 */
export interface OutputLine {
  /** The text content */
  text: string;
  /** The style/color to apply */
  style?: OutputStyle;
  /** Delay in ms before showing this line */
  delay?: number;
  /** Whether this line should replace the previous line */
  replacePrevious?: boolean;
}

/**
 * Available output styles for terminal text
 */
export type OutputStyle =
  | 'default'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'dim'
  | 'bold'
  | 'cyan'
  | 'magenta'
  | 'yellow'
  | 'green'
  | 'red'
  | 'blue';

/**
 * Cleanup function returned by feature launchers
 */
export type CleanupFn = () => Promise<void>;

/**
 * Result of launching a feature
 */
export interface FeatureResult {
  /** Name of the feature */
  name: string;
  /** Cleanup function to stop the feature */
  cleanup: CleanupFn;
}

/**
 * Platform detection result
 */
export type Platform = 'linux' | 'darwin' | 'win32';

/**
 * Terminal emulator configuration
 */
export interface TerminalConfig {
  /** Command to launch the terminal */
  command: string;
  /** Arguments to pass (use {cmd} as placeholder for the command to run) */
  args: string[];
}

/**
 * Progress bar configuration
 */
export interface ProgressConfig {
  /** Total steps */
  total: number;
  /** Current progress */
  current: number;
  /** Label text */
  label: string;
}

/**
 * Option definition for the interactive checklist
 */
export interface OptionDefinition {
  /** Unique key for the option */
  key: keyof LookbusyOptions;
  /** Display label */
  label: string;
  /** Description shown in help */
  description: string;
  /** Whether enabled by default */
  defaultEnabled: boolean;
}

/**
 * All available options with their definitions
 */
export const OPTION_DEFINITIONS: OptionDefinition[] = [
  {
    key: 'terminalOutput',
    label: 'Terminal output',
    description: 'Fake commands with spinners and progress bars',
    defaultEnabled: true,
  },
  {
    key: 'spawnTerminal',
    label: 'Spawn additional terminal',
    description: 'Open a new terminal window with fake output',
    defaultEnabled: true,
  },
  {
    key: 'browserDashboard',
    label: 'Browser dashboard',
    description: 'Launch a browser with a fake DevOps dashboard',
    defaultEnabled: true,
  },
  {
    key: 'nativeWindow',
    label: 'Native installer window',
    description: 'Show a native window with fake installation progress',
    defaultEnabled: true,
  },
  {
    key: 'stayAwake',
    label: 'Stay awake',
    description: 'Prevent the screen from sleeping',
    defaultEnabled: true,
  },
];

/**
 * Create default options with all features enabled
 */
export function createDefaultOptions(): LookbusyOptions {
  return {
    terminalOutput: true,
    spawnTerminal: true,
    browserDashboard: true,
    nativeWindow: true,
    stayAwake: true,
  };
}
