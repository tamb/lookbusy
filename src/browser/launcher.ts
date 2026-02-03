import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import open from 'open';
import type { CleanupFn, FeatureResult } from '../types.js';

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
 * Launch a browser with the fake dashboard
 * Uses a local HTTP server and the system's default browser
 */
export async function launchBrowser(): Promise<FeatureResult> {
  let server: Server | null = null;
  let browserProcess: Awaited<ReturnType<typeof open>> | null = null;

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

    // Open in the default browser
    browserProcess = await open(url);
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
        browserProcess.kill();
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
