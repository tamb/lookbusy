import { describe, expect, it } from 'vitest';
import type { OutputLine } from '../../types.js';
import {
  generateApiCalls,
  generateDbMigration,
  generateDockerPull,
  generateGitOperations,
  generateK8sDeploy,
  generateNpmInstall,
  generateTestRun,
  generateWebpackBuild,
  getAllCommands,
  getRandomCommand,
} from '../commands.js';

async function collectOutput(generator: AsyncGenerator<OutputLine>): Promise<OutputLine[]> {
  const lines: OutputLine[] = [];
  for await (const line of generator) {
    lines.push(line);
  }
  return lines;
}

describe('generateNpmInstall', () => {
  it('should generate npm install output', async () => {
    const output = await collectOutput(generateNpmInstall());

    expect(output.length).toBeGreaterThan(3);
    expect(output[0].text).toBe('$ npm install');
    expect(output[0].style).toBe('bold');

    // Should end with "added X packages" message
    const lastNonEmpty = output.filter((l) => l.text).pop();
    expect(lastNonEmpty?.text).toMatch(/added \d+ packages/);
    expect(lastNonEmpty?.style).toBe('green');
  });

  it('should include package names with versions', async () => {
    const output = await collectOutput(generateNpmInstall());
    const packageLines = output.filter((l) => l.text.includes('@') && l.style === 'cyan');

    expect(packageLines.length).toBeGreaterThan(0);
    // Should match pattern like "  package@1.2.3" (packages can have dots like socket.io)
    packageLines.forEach((line) => {
      expect(line.text).toMatch(/^\s+[\w@/.@-]+@\d+\.\d+\.\d+$/);
    });
  });
});

describe('generateDockerPull', () => {
  it('should generate docker pull output', async () => {
    const output = await collectOutput(generateDockerPull());

    expect(output.length).toBeGreaterThan(5);
    expect(output[0].text).toMatch(/^\$ docker pull .+/);
    expect(output[0].style).toBe('bold');
  });

  it('should include download progress and completion', async () => {
    const output = await collectOutput(generateDockerPull());

    const downloadLines = output.filter((l) => l.text.includes('Download'));
    expect(downloadLines.length).toBeGreaterThan(0);

    const digestLine = output.find((l) => l.text.includes('Digest:'));
    expect(digestLine).toBeDefined();
  });
});

describe('generateGitOperations', () => {
  it('should generate git operation output', async () => {
    const output = await collectOutput(generateGitOperations());

    expect(output.length).toBeGreaterThan(2);
    expect(output[0].text).toMatch(/^\$ git (fetch|pull|rebase|merge)/);
    expect(output[0].style).toBe('bold');
  });
});

describe('generateWebpackBuild', () => {
  it('should generate webpack or vite build output', async () => {
    const output = await collectOutput(generateWebpackBuild());

    expect(output.length).toBeGreaterThan(5);
    expect(output[0].text).toBe('$ npm run build');

    // Should have success message
    const successLine = output.find(
      (l) => l.text.includes('compiled successfully') || l.text.includes('built in'),
    );
    expect(successLine).toBeDefined();
    expect(successLine?.style).toBe('green');
  });
});

describe('generateDbMigration', () => {
  it('should generate database migration output', async () => {
    const output = await collectOutput(generateDbMigration());

    expect(output.length).toBeGreaterThan(3);
    expect(output[0].text).toMatch(/^\$ npx (prisma|typeorm|sequelize|knex) migrate/);

    // Should have success message
    const successLine = output.find((l) => l.style === 'green' && l.text.includes('migration'));
    expect(successLine).toBeDefined();
  });
});

describe('generateTestRun', () => {
  it('should generate test run output', async () => {
    const output = await collectOutput(generateTestRun());

    expect(output.length).toBeGreaterThan(3);
    expect(output[0].text).toBe('$ npm test');

    // Should have test results with checkmarks or passing message
    const testLines = output.filter(
      (l) => l.text.includes('✓') || l.text.includes('✗') || l.text.includes('passing'),
    );
    expect(testLines.length).toBeGreaterThan(0);
  });
});

describe('generateK8sDeploy', () => {
  it('should generate kubernetes deployment output', async () => {
    const output = await collectOutput(generateK8sDeploy());

    expect(output.length).toBeGreaterThan(3);
    expect(output[0].text).toBe('$ kubectl apply -f k8s/');

    // Should have rollout success message
    const successLine = output.find((l) => l.text.includes('successfully rolled out'));
    expect(successLine).toBeDefined();
    expect(successLine?.style).toBe('green');
  });
});

describe('generateApiCalls', () => {
  it('should generate API call logs', async () => {
    const output = await collectOutput(generateApiCalls());

    expect(output.length).toBeGreaterThan(5);
    expect(output[0].text).toMatch(/^\$ curl/);

    // Should have HTTP method calls
    const httpLines = output.filter(
      (l) =>
        l.text.includes('GET') ||
        l.text.includes('POST') ||
        l.text.includes('PUT') ||
        l.text.includes('DELETE'),
    );
    expect(httpLines.length).toBeGreaterThan(0);
  });
});

describe('getAllCommands', () => {
  it('should return all available commands', () => {
    const commands = getAllCommands();

    expect(commands.length).toBe(8);
    commands.forEach((cmd) => {
      expect(cmd.name).toBeDefined();
      expect(typeof cmd.output).toBe('function');
      expect(cmd.duration).toBeGreaterThan(0);
    });
  });
});

describe('getRandomCommand', () => {
  it('should return a valid command', () => {
    const cmd = getRandomCommand();

    expect(cmd.name).toBeDefined();
    expect(typeof cmd.output).toBe('function');
    expect(cmd.duration).toBeGreaterThan(0);
  });

  it('should return different commands on multiple calls', () => {
    const commands = new Set<string>();
    for (let i = 0; i < 50; i++) {
      commands.add(getRandomCommand().name);
    }
    // With 50 attempts, we should get at least 3 different commands
    expect(commands.size).toBeGreaterThanOrEqual(3);
  });
});
