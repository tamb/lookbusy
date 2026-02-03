import { describe, expect, it } from 'vitest';
import { getWebappContent, getWebappPath } from '../launcher.js';

describe('getWebappPath', () => {
  it('should return a string path', () => {
    const path = getWebappPath();
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('should return a path containing index.html', () => {
    const path = getWebappPath();
    expect(path).toContain('index.html');
  });
});

describe('getWebappContent', () => {
  it('should return HTML content', () => {
    const content = getWebappContent();
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('<html');
    expect(content).toContain('</html>');
  });

  it('should contain DevOps Dashboard elements', () => {
    const content = getWebappContent();
    expect(content).toContain('DevOps Dashboard');
    expect(content).toContain('Deployment');
  });

  it('should contain required dashboard sections', () => {
    const content = getWebappContent();
    expect(content).toContain('CPU');
    expect(content).toContain('Memory');
    expect(content).toContain('Network');
    expect(content).toContain('Logs');
  });
});
