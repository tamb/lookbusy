import { type ChildProcess, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import open from 'open';
import type { CleanupFn, FeatureResult, WindowGeometry } from '../types.js';
import {
  commandExists,
  getPlatform,
  getScreenDimensions,
  hasWmctrl,
  listWindows,
  moveWindowById,
} from '../utils/platform.js';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the webapp HTML file
 */
export function getWebappPath(): string {
  // Try multiple locations for the webapp
  // Note: tsup bundles everything flat into dist/, so __dirname is dist/
  const possiblePaths = [
    // When running from dist/ (production) - webapp is in src/browser/webapp/
    join(__dirname, '..', 'src', 'browser', 'webapp', 'index.html'),
    // When running tests or from source
    join(__dirname, 'webapp', 'index.html'),
    join(__dirname, '..', 'browser', 'webapp', 'index.html'),
  ];

  for (const path of possiblePaths) {
    try {
      readFileSync(path);
      return path;
    } catch {}
  }

  // Default to the first path (will show a helpful error)
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
 * Find an available port starting from the given port
 */
async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startPort, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : startPort;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      // Port in use, try next one
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

/**
 * Detect available browser that supports window positioning
 */
function detectPositionableBrowser(): {
  command: string;
  args: (url: string, geom: WindowGeometry) => string[];
} | null {
  const platform = getPlatform();

  if (platform === 'linux') {
    // Chrome/Chromium support window positioning
    if (commandExists('google-chrome')) {
      return {
        command: 'google-chrome',
        args: (url, geom) => [
          `--window-position=${geom.x},${geom.y}`,
          `--window-size=${geom.width},${geom.height}`,
          '--new-window',
          url,
        ],
      };
    }
    if (commandExists('chromium')) {
      return {
        command: 'chromium',
        args: (url, geom) => [
          `--window-position=${geom.x},${geom.y}`,
          `--window-size=${geom.width},${geom.height}`,
          '--new-window',
          url,
        ],
      };
    }
    if (commandExists('chromium-browser')) {
      return {
        command: 'chromium-browser',
        args: (url, geom) => [
          `--window-position=${geom.x},${geom.y}`,
          `--window-size=${geom.width},${geom.height}`,
          '--new-window',
          url,
        ],
      };
    }
    // Firefox doesn't support command-line window positioning well
  } else if (platform === 'darwin') {
    // On macOS, Chrome supports positioning
    if (commandExists('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')) {
      return {
        command: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: (url, geom) => [
          `--window-position=${geom.x},${geom.y}`,
          `--window-size=${geom.width},${geom.height}`,
          '--new-window',
          url,
        ],
      };
    }
  } else if (platform === 'win32') {
    // Check for Chrome on Windows
    if (commandExists('chrome')) {
      return {
        command: 'chrome',
        args: (url, geom) => [
          `--window-position=${geom.x},${geom.y}`,
          `--window-size=${geom.width},${geom.height}`,
          '--new-window',
          url,
        ],
      };
    }
  }

  return null;
}

/**
 * Launch a browser with the fake dashboard
 * Uses a local HTTP server and positions based on layout option
 * @param gridLayout - If true, position on left half; if false, fullscreen
 */
export async function launchBrowser(gridLayout = false): Promise<FeatureResult> {
  let server: Server | null = null;
  let browserProcess: Awaited<ReturnType<typeof open>> | ChildProcess | null = null;

  try {
    // Get the HTML content
    const htmlContent = getWebappContent();

    // Find an available port
    const port = await findAvailablePort(3847);

    // Create a simple HTTP server to serve the dashboard
    server = createServer((_req, res) => {
      // Serve the HTML for any request
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(htmlContent);
    });

    // Start the server
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        reject(new Error('Server not initialized'));
        return;
      }
      server.listen(port, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });

    const url = `http://127.0.0.1:${port}`;

    // Calculate geometry based on layout mode
    const screen = getScreenDimensions();
    const geometry: WindowGeometry = gridLayout
      ? {
          // Grid layout: left half of screen
          x: 0,
          y: 0,
          width: Math.floor(screen.width / 2),
          height: screen.height,
        }
      : {
          // Fullscreen layout
          x: 0,
          y: 0,
          width: screen.width,
          height: screen.height,
        };

    // Browser window title patterns to match
    const browserPatterns = [
      'chrome',
      'chromium',
      'firefox',
      'localhost',
      '127.0.0.1',
      'opera',
      'edge',
    ];

    // Get existing windows before launching browser
    const windowsBefore = getPlatform() === 'linux' && hasWmctrl() ? listWindows() : [];
    const windowIdsBefore = new Set(windowsBefore.map((w) => w.id));

    // Try to launch browser with positioning
    const positionableBrowser = detectPositionableBrowser();

    if (positionableBrowser) {
      const args = positionableBrowser.args(url, geometry);
      browserProcess = spawn(positionableBrowser.command, args, {
        detached: true,
        stdio: 'ignore',
      });
      (browserProcess as ChildProcess).unref();
    } else {
      // Fall back to default browser without positioning
      browserProcess = await open(url);
    }

    // Use wmctrl to position the window after it opens (more reliable on Linux)
    if (getPlatform() === 'linux' && hasWmctrl()) {
      // Wait for the browser window to appear
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Find new browser windows
      const windowsAfter = listWindows();
      const newBrowserWindows = windowsAfter.filter(
        (w) =>
          !windowIdsBefore.has(w.id) &&
          browserPatterns.some((p) => w.title.toLowerCase().includes(p)),
      );

      // Position the new browser window
      if (newBrowserWindows.length > 0) {
        moveWindowById(
          newBrowserWindows[0].id,
          geometry.x,
          geometry.y,
          geometry.width,
          geometry.height,
        );
      } else {
        // Fallback: try to find any window matching browser patterns
        const allBrowserWindows = windowsAfter.filter((w) =>
          browserPatterns.some((p) => w.title.toLowerCase().includes(p)),
        );
        if (allBrowserWindows.length > 0) {
          // Position the most recent browser window (last in list)
          const lastBrowser = allBrowserWindows[allBrowserWindows.length - 1];
          moveWindowById(lastBrowser.id, geometry.x, geometry.y, geometry.width, geometry.height);
        }
      }
    }
  } catch (error) {
    // Clean up on error
    if (server) {
      server.close();
    }

    console.warn('Failed to launch browser:', error);
    return {
      name: 'browser-dashboard',
      cleanup: async () => {},
    };
  }

  const cleanup: CleanupFn = async () => {
    // Close the HTTP server
    if (server) {
      server.close();
    }

    // Try to kill the browser process if we have a reference
    if (browserProcess && 'kill' in browserProcess) {
      try {
        (browserProcess as ChildProcess).kill();
      } catch {
        // Browser may already be closed
      }
    }
  };

  return {
    name: 'browser-dashboard',
    cleanup,
  };
}

/**
 * Check if browser launching is available
 * With the open package, this should always work
 */
export async function areBrowsersInstalled(): Promise<boolean> {
  return true;
}
