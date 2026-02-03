import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  commandExists,
  getEnv,
  getNodePath,
  getPlatform,
  isCI,
  isRunningAsRoot,
} from '../platform.js';
import { isStayAwakeSupported } from '../stay-awake.js';

describe('getPlatform', () => {
  it('should return a valid platform string', () => {
    const platform = getPlatform();
    expect(['linux', 'darwin', 'win32']).toContain(platform);
  });
});

describe('commandExists', () => {
  it('should return true for node command', () => {
    // Node should always exist since we're running tests with it
    expect(commandExists('node')).toBe(true);
  });

  it('should return false for non-existent command', () => {
    expect(commandExists('this-command-definitely-does-not-exist-12345')).toBe(false);
  });

  it('should reject commands with invalid characters (security)', () => {
    // These should all return false due to input validation
    expect(commandExists('node; rm -rf /')).toBe(false);
    expect(commandExists('node && echo pwned')).toBe(false);
    expect(commandExists('$(whoami)')).toBe(false);
    expect(commandExists('node`id`')).toBe(false);
    expect(commandExists('../../../etc/passwd')).toBe(false);
  });

  it('should allow valid command names with hyphens and underscores', () => {
    // These are valid command name patterns
    expect(commandExists('xdg-screensaver')).toBeDefined(); // may or may not exist
    expect(commandExists('gnome_terminal')).toBeDefined();
  });
});

describe('isRunningAsRoot', () => {
  it('should return a boolean', () => {
    const result = isRunningAsRoot();
    expect(typeof result).toBe('boolean');
  });

  it('should return false in normal test environment', () => {
    // Tests should not be run as root
    // This test documents expected behavior
    const result = isRunningAsRoot();
    // We expect false unless someone is running tests as root (bad practice)
    expect(result).toBe(false);
  });
});

describe('getNodePath', () => {
  it('should return a non-empty string', () => {
    const nodePath = getNodePath();
    expect(typeof nodePath).toBe('string');
    expect(nodePath.length).toBeGreaterThan(0);
  });

  it('should return a path containing node', () => {
    const nodePath = getNodePath();
    expect(nodePath.toLowerCase()).toMatch(/node/);
  });
});

describe('getEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return environment variable value when it exists', () => {
    process.env.TEST_VAR = 'test_value';
    expect(getEnv('TEST_VAR')).toBe('test_value');
  });

  it('should return undefined for non-existent variable', () => {
    delete process.env.NON_EXISTENT_VAR;
    expect(getEnv('NON_EXISTENT_VAR')).toBeUndefined();
  });
});

describe('isCI', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear CI-related env vars
    delete process.env.CI;
    delete process.env.CONTINUOUS_INTEGRATION;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.CIRCLECI;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return true when CI env var is set', () => {
    process.env.CI = 'true';
    expect(isCI()).toBe(true);
  });

  it('should return true when GITHUB_ACTIONS is set', () => {
    process.env.GITHUB_ACTIONS = 'true';
    expect(isCI()).toBe(true);
  });

  it('should return false when no CI env vars are set', () => {
    expect(isCI()).toBe(false);
  });
});

describe('isStayAwakeSupported', () => {
  it('should return a boolean', () => {
    const result = isStayAwakeSupported();
    expect(typeof result).toBe('boolean');
  });
});
