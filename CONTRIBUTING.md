# Contributing to belazy

Thank you for your interest in contributing to belazy! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Testing as an npm Package](#testing-as-an-npm-package)
- [Submitting Changes](#submitting-changes)
- [Style Guidelines](#style-guidelines)

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to make something fun!

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/belazy.git
   cd belazy
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/belazy.git
   ```

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Install Playwright browsers (for browser dashboard feature)
npx playwright install chromium
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build the TypeScript project |
| `npm run dev` | Build in watch mode (rebuilds on file changes) |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run check` | Run Biome linter and formatter checks |
| `npm run check:fix` | Auto-fix Biome linting and formatting issues |
| `npm run lint` | Run Biome linter only |
| `npm run format` | Run Biome formatter only |
| `npm run typecheck` | Type-check the project with TypeScript |

## Project Structure

```
belazy/
├── bin/
│   └── belazy.js           # CLI entry point
├── src/
│   ├── cli.ts                # CLI argument parsing
│   ├── index.ts              # Main orchestrator
│   ├── types.ts              # TypeScript interfaces
│   ├── spawned-terminal.ts   # Script for spawned terminals
│   ├── terminal/
│   │   ├── commands.ts       # Fake command generators
│   │   ├── output.ts         # Terminal output renderer
│   │   ├── spawner.ts        # Terminal window spawner
│   │   └── __tests__/        # Terminal module tests
│   ├── browser/
│   │   ├── launcher.ts       # Playwright browser launcher
│   │   ├── webapp/           # Dashboard HTML/CSS/JS
│   │   └── __tests__/        # Browser module tests
│   ├── native/
│   │   ├── window.ts         # Native window launcher
│   │   └── installer.html    # Installer UI template
│   └── utils/
│       ├── platform.ts       # Platform detection
│       ├── stay-awake.ts     # Screen sleep prevention
│       └── __tests__/        # Utility tests
├── dist/                     # Compiled output (generated)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Making Changes

### Creating a Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Adding New Fake Commands

To add a new fake command type (e.g., fake AWS CLI output):

1. Open `src/terminal/commands.ts`
2. Add your generator function:
   ```typescript
   export async function* generateAwsCli(): AsyncGenerator<OutputLine> {
     yield { text: '$ aws s3 sync . s3://my-bucket', style: 'bold', delay: 100 };
     // Add more output lines...
   }
   ```
3. Add it to `getAllCommands()`:
   ```typescript
   { name: 'aws cli', output: generateAwsCli, duration: 3000 },
   ```
4. Add tests in `src/terminal/__tests__/commands.test.ts`

### Adding New Features

1. Create your module in the appropriate directory
2. Export a function that returns `FeatureResult` with a cleanup function
3. Add the feature to `src/types.ts` if it needs configuration
4. Wire it into `src/index.ts`
5. Add tests for your module

## Testing

### Running Tests

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode (recommended during development)
npm test

# Run a specific test file
npx vitest run src/terminal/__tests__/commands.test.ts

# Run tests with coverage
npx vitest run --coverage
```

### Writing Tests

We use [Vitest](https://vitest.dev/) for testing. Tests should be placed in `__tests__` directories next to the code they test.

Example test structure:

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myModule.js';

describe('myFunction', () => {
  it('should do something specific', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Test Guidelines

- Test pure functions thoroughly (command generators, utilities)
- Mock external dependencies (child_process, file system) for unit tests
- Keep tests fast - avoid unnecessary delays
- Use descriptive test names that explain the expected behavior

## Testing as an npm Package

Before submitting a PR, test your changes as if they were installed from npm.

### Method 1: npm link (Recommended)

```bash
# In the belazy directory
npm run build
npm link

# Now you can run it from anywhere
belazy
belazy --options

# When done, unlink
npm unlink -g belazy
```

### Method 2: npm pack

```bash
# Create a tarball
npm run build
npm pack

# This creates belazy-1.0.0.tgz
# Install it in another directory
cd /tmp
mkdir test-belazy
cd test-belazy
npm init -y
npm install /path/to/belazy/belazy-1.0.0.tgz

# Run it
npx belazy
```

### Method 3: Local Install

```bash
# In another directory
mkdir /tmp/test-belazy
cd /tmp/test-belazy
npm init -y
npm install /path/to/belazy

# Run it
npx belazy
```

### Testing Checklist

Before submitting, verify:

- [ ] `npm run build` completes without errors
- [ ] `npm run test:run` passes all tests
- [ ] `npm run check` reports no linting or formatting issues
- [ ] `npm run typecheck` reports no type errors
- [ ] The CLI runs correctly: `npx belazy`
- [ ] The options flag works: `npx belazy --options`
- [ ] Ctrl+C cleanly exits and cleans up all processes
- [ ] Each feature works individually (test via `--options`)

### Platform-Specific Testing

If possible, test on multiple platforms:

- **Linux**: Test terminal spawning, zenity dialogs, stay awake
- **macOS**: Test Terminal.app spawning, AppleScript dialogs, caffeinate
- **Windows**: Test Windows Terminal/PowerShell, PowerShell dialogs

## Submitting Changes

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add fake terraform command output
fix: prevent zombie processes on Linux
docs: update README with new options
test: add tests for platform detection
refactor: simplify terminal spawner logic
```

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Create a Pull Request on GitHub
5. Fill in the PR template with:
   - Description of changes
   - Related issue (if any)
   - Testing performed
   - Screenshots (if UI changes)

### PR Checklist

- [ ] Code follows the project style
- [ ] Tests added/updated for changes
- [ ] Documentation updated (if needed)
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Tested locally as npm package

## Style Guidelines

We use [Biome](https://biomejs.dev/) for linting and formatting. Biome is an all-in-one toolchain that replaces ESLint and Prettier.

### Running Biome

```bash
# Check for issues
npm run check

# Auto-fix issues
npm run check:fix

# Lint only
npm run lint

# Format only
npm run format
```

### TypeScript

- Use TypeScript strict mode
- Export types/interfaces from `types.ts`
- Use `async/await` over raw promises
- Prefer `const` over `let`
- Use meaningful variable names
- Use `node:` protocol for Node.js built-in imports (e.g., `import { join } from 'node:path'`)

### Code Organization

- Keep functions small and focused
- One export per concern
- Group related functionality in modules
- Use JSDoc comments for public APIs

### Example Function Style

```typescript
/**
 * Generate fake npm install output
 * @returns AsyncGenerator yielding output lines
 */
export async function* generateNpmInstall(): AsyncGenerator<OutputLine> {
  const packages = getRandomPackages(5, 15);
  
  yield { text: '$ npm install', style: 'bold', delay: 100 };
  
  for (const pkg of packages) {
    yield { 
      text: `  ${pkg.name}@${pkg.version}`, 
      style: 'cyan',
      delay: randomInt(50, 200) 
    };
  }
  
  yield { 
    text: `added ${packages.length} packages`, 
    style: 'green',
    delay: 200 
  };
}
```

## Questions?

If you have questions, feel free to:

- Open an issue on GitHub
- Start a discussion in the repository

Thank you for contributing! 🎉
