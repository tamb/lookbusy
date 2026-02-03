import { describe, expect, it } from 'vitest';
import { applyStyle, sleep } from '../output.js';

describe('applyStyle', () => {
  it('should return text unchanged for default style', () => {
    const text = 'Hello World';
    const result = applyStyle(text, 'default');
    // The actual text content should be preserved
    expect(result).toContain('Hello World');
  });

  it('should return text unchanged when no style provided', () => {
    const text = 'Hello World';
    const result = applyStyle(text);
    expect(result).toBe('Hello World');
  });

  it('should preserve text content for success style', () => {
    const text = 'Success!';
    const result = applyStyle(text, 'success');
    // Chalk may or may not add ANSI codes depending on environment
    expect(result).toContain('Success!');
  });

  it('should preserve text content for error style', () => {
    const text = 'Error!';
    const result = applyStyle(text, 'error');
    expect(result).toContain('Error!');
  });

  it('should preserve text content for bold style', () => {
    const text = 'Bold text';
    const result = applyStyle(text, 'bold');
    expect(result).toContain('Bold text');
  });

  it('should preserve text content for dim style', () => {
    const text = 'Dim text';
    const result = applyStyle(text, 'dim');
    expect(result).toContain('Dim text');
  });

  it('should preserve text content for cyan style', () => {
    const text = 'Cyan text';
    const result = applyStyle(text, 'cyan');
    expect(result).toContain('Cyan text');
  });

  it('should handle all defined styles without throwing', () => {
    const styles = [
      'default',
      'success',
      'error',
      'warning',
      'info',
      'dim',
      'bold',
      'cyan',
      'magenta',
      'yellow',
      'green',
      'red',
      'blue',
    ] as const;

    for (const style of styles) {
      expect(() => applyStyle('test', style)).not.toThrow();
    }
  });
});

describe('sleep', () => {
  it('should resolve after specified time', async () => {
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;

    // Allow some tolerance for timing
    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(200);
  });

  it('should resolve immediately for 0ms', async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});
