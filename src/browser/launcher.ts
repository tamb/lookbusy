import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Browser, type BrowserContext, chromium, type Page } from 'playwright';
import type { CleanupFn, FeatureResult } from '../types.js';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the webapp HTML file
 */
export function getWebappPath(): string {
  // Try multiple locations for the webapp
  const possiblePaths = [
    join(__dirname, 'webapp', 'index.html'),
    join(__dirname, '..', 'browser', 'webapp', 'index.html'),
    join(__dirname, '..', '..', 'src', 'browser', 'webapp', 'index.html'),
  ];

  for (const path of possiblePaths) {
    try {
      readFileSync(path);
      return path;
    } catch {}
  }

  // Default to the first path
  return possiblePaths[0];
}

/**
 * Get the HTML content for the webapp
 */
export function getWebappContent(): string {
  const htmlPath = getWebappPath();
  return readFileSync(htmlPath, 'utf-8');
}

/**
 * Launch a browser with the fake dashboard
 */
export async function launchBrowser(): Promise<FeatureResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // Launch browser in headed mode
    browser = await chromium.launch({
      headless: false,
      args: [
        '--start-maximized',
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    // Create a new context with viewport
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });

    // Create a new page
    page = await context.newPage();

    // Load the webapp HTML
    const htmlContent = getWebappContent();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    // Set a nice title (runs in browser context where document is available)
    await page.evaluate(() => {
      const doc = (globalThis as { document?: { title: string } }).document;
      if (doc) {
        doc.title = 'DevOps Dashboard - Deployment in Progress';
      }
    });
  } catch (error) {
    // Clean up on error
    if (browser) {
      await browser.close().catch(() => {});
    }

    console.warn('Failed to launch browser:', error);
    return {
      name: 'browser-dashboard',
      cleanup: async () => {},
    };
  }

  const cleanup: CleanupFn = async () => {
    try {
      if (browser) {
        await browser.close();
      }
    } catch {
      // Browser may already be closed
    }
  };

  return {
    name: 'browser-dashboard',
    cleanup,
  };
}

/**
 * Check if Playwright browsers are installed
 */
export async function areBrowsersInstalled(): Promise<boolean> {
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    return true;
  } catch {
    return false;
  }
}
