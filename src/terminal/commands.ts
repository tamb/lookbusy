import type { FakeCommand, OutputLine } from '../types.js';

// Random data generators
const packageNames = [
  'react',
  'vue',
  'angular',
  'express',
  'lodash',
  'axios',
  'webpack',
  'typescript',
  'babel',
  'eslint',
  'prettier',
  'jest',
  'mocha',
  'chai',
  '@types/node',
  '@babel/core',
  '@webpack/cli',
  'next',
  'nuxt',
  'gatsby',
  'graphql',
  'apollo-server',
  'prisma',
  '@prisma/client',
  'mongoose',
  'sequelize',
  'typeorm',
  'redis',
  'ioredis',
  'bull',
  'socket.io',
  'fastify',
  'koa',
  'hapi',
  'nest',
  '@nestjs/core',
  'aws-sdk',
  'firebase',
  'stripe',
  'twilio',
  'nodemailer',
  'passport',
  'bcrypt',
  'jsonwebtoken',
];

const dockerImages = [
  'node:18-alpine',
  'python:3.11-slim',
  'postgres:15',
  'redis:7-alpine',
  'nginx:latest',
  'mongo:6',
  'mysql:8',
  'rabbitmq:3-management',
  'elasticsearch:8.10.0',
  'grafana/grafana:latest',
  'prom/prometheus',
  'traefik:v2.10',
  'hashicorp/vault:1.15',
  'minio/minio:latest',
];

const branchNames = [
  'feature/user-auth',
  'feature/payment-integration',
  'fix/memory-leak',
  'fix/null-pointer',
  'hotfix/security-patch',
  'develop',
  'staging',
  'release/v2.1.0',
  'feature/api-v3',
  'chore/dependency-updates',
];

const testFiles = [
  'auth.test.ts',
  'user.service.test.ts',
  'payment.test.ts',
  'api.test.ts',
  'database.test.ts',
  'utils.test.ts',
  'middleware.test.ts',
  'routes.test.ts',
  'integration/auth.test.ts',
  'integration/checkout.test.ts',
  'e2e/flow.test.ts',
];

const migrationNames = [
  'create_users_table',
  'add_email_index',
  'create_orders_table',
  'add_payment_columns',
  'create_sessions_table',
  'add_foreign_keys',
  'create_audit_log',
  'add_timestamps',
  'create_permissions_table',
];

const k8sResources = [
  'deployment/api-server',
  'deployment/worker',
  'deployment/scheduler',
  'service/api-gateway',
  'service/redis-cluster',
  'configmap/app-config',
  'secret/db-credentials',
  'ingress/main',
  'hpa/api-server',
];

const apiEndpoints = [
  '/api/v1/users',
  '/api/v1/orders',
  '/api/v1/products',
  '/api/v1/auth/login',
  '/api/v1/payments',
  '/api/v1/webhooks',
  '/api/v1/analytics',
  '/api/v1/search',
  '/api/v2/graphql',
  '/api/health',
  '/api/metrics',
];

// Helper functions
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomVersion(): string {
  return `${randomInt(0, 20)}.${randomInt(0, 15)}.${randomInt(0, 30)}`;
}

function randomHash(): string {
  return Math.random().toString(16).substring(2, 10);
}

function randomSize(): string {
  const units = ['KB', 'MB'];
  const unit = randomItem(units);
  const size = unit === 'KB' ? randomInt(10, 999) : randomInt(1, 50);
  return `${size}${unit}`;
}

function _sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate fake npm install output
 */
export async function* generateNpmInstall(): AsyncGenerator<OutputLine> {
  const packages = Array.from({ length: randomInt(5, 15) }, () => randomItem(packageNames));

  yield { text: `$ npm install`, style: 'bold', delay: 100 };
  yield { text: '', delay: 50 };

  for (const pkg of packages) {
    const version = randomVersion();
    yield {
      text: `  ${pkg}@${version}`,
      style: 'cyan',
      delay: randomInt(50, 200),
    };
  }

  yield { text: '', delay: 100 };
  yield {
    text: `added ${packages.length} packages in ${randomInt(2, 8)}s`,
    style: 'green',
    delay: 200,
  };
  yield { text: '', delay: 300 };
}

/**
 * Generate fake docker pull output
 */
export async function* generateDockerPull(): AsyncGenerator<OutputLine> {
  const image = randomItem(dockerImages);
  const layers = randomInt(4, 8);

  yield { text: `$ docker pull ${image}`, style: 'bold', delay: 100 };

  for (let i = 1; i <= layers; i++) {
    const hash = randomHash();
    yield { text: `${hash}: Pulling fs layer`, style: 'dim', delay: randomInt(100, 300) };
  }

  for (let i = 1; i <= layers; i++) {
    const hash = randomHash();
    const size = randomSize();
    for (let progress = 0; progress <= 100; progress += randomInt(15, 35)) {
      const actualProgress = Math.min(progress, 100);
      yield {
        text: `${hash}: Downloading  [${'>'.repeat(Math.floor(actualProgress / 5))}${' '.repeat(20 - Math.floor(actualProgress / 5))}]  ${actualProgress}%  ${size}`,
        style: 'default',
        delay: randomInt(100, 400),
        replacePrevious: progress > 0,
      };
    }
    yield { text: `${hash}: Download complete`, style: 'green', delay: 50 };
  }

  yield { text: `Digest: sha256:${randomHash()}${randomHash()}`, style: 'dim', delay: 200 };
  yield { text: `Status: Downloaded newer image for ${image}`, style: 'green', delay: 100 };
  yield { text: '', delay: 300 };
}

/**
 * Generate fake git operations output
 */
export async function* generateGitOperations(): AsyncGenerator<OutputLine> {
  const operations = ['fetch', 'pull', 'rebase', 'merge'];
  const operation = randomItem(operations);
  const branch = randomItem(branchNames);

  if (operation === 'fetch') {
    yield { text: `$ git fetch origin`, style: 'bold', delay: 100 };
    yield {
      text: `remote: Enumerating objects: ${randomInt(50, 500)}, done.`,
      style: 'dim',
      delay: 200,
    };
    yield {
      text: `remote: Counting objects: 100% (${randomInt(20, 100)}/${randomInt(20, 100)}), done.`,
      style: 'dim',
      delay: 150,
    };
    yield {
      text: `remote: Compressing objects: 100% (${randomInt(10, 50)}/${randomInt(10, 50)}), done.`,
      style: 'dim',
      delay: 150,
    };
    yield { text: `Receiving objects: 100%, ${randomSize()}, done.`, style: 'default', delay: 300 };
    yield { text: `From github.com:company/project`, style: 'default', delay: 100 };
    yield {
      text: `   ${randomHash()}..${randomHash()}  ${branch} -> origin/${branch}`,
      style: 'cyan',
      delay: 100,
    };
  } else if (operation === 'pull') {
    yield { text: `$ git pull origin ${branch}`, style: 'bold', delay: 100 };
    yield { text: `From github.com:company/project`, style: 'default', delay: 200 };
    yield { text: ` * branch            ${branch} -> FETCH_HEAD`, style: 'default', delay: 100 };
    yield { text: `Updating ${randomHash()}..${randomHash()}`, style: 'default', delay: 150 };
    yield { text: `Fast-forward`, style: 'green', delay: 100 };
    const files = randomInt(2, 8);
    for (let i = 0; i < files; i++) {
      yield {
        text: ` src/${randomItem(['components', 'utils', 'services', 'api'])}/${randomItem(['index', 'main', 'helper', 'util'])}.ts | ${randomInt(5, 50)} ${`+${'+'.repeat(randomInt(1, 5))}`}`,
        style: 'default',
        delay: 50,
      };
    }
    yield {
      text: ` ${files} files changed, ${randomInt(50, 200)} insertions(+), ${randomInt(10, 80)} deletions(-)`,
      style: 'default',
      delay: 100,
    };
  } else if (operation === 'rebase') {
    yield { text: `$ git rebase origin/${branch}`, style: 'bold', delay: 100 };
    const commits = randomInt(3, 8);
    for (let i = 1; i <= commits; i++) {
      yield {
        text: `Applying: ${randomItem(['feat', 'fix', 'chore', 'refactor'])}: ${randomItem(['update', 'add', 'fix', 'improve'])} ${randomItem(['authentication', 'database', 'API', 'UI'])}`,
        style: 'default',
        delay: randomInt(200, 500),
      };
    }
    yield {
      text: `Successfully rebased and updated refs/heads/${branch}.`,
      style: 'green',
      delay: 200,
    };
  } else {
    yield { text: `$ git merge ${branch}`, style: 'bold', delay: 100 };
    yield { text: `Merge made by the 'ort' strategy.`, style: 'default', delay: 300 };
    const files = randomInt(3, 10);
    yield {
      text: ` ${files} files changed, ${randomInt(100, 500)} insertions(+), ${randomInt(20, 150)} deletions(-)`,
      style: 'default',
      delay: 150,
    };
  }

  yield { text: '', delay: 300 };
}

/**
 * Generate fake webpack/vite build output
 */
export async function* generateWebpackBuild(): AsyncGenerator<OutputLine> {
  const isVite = Math.random() > 0.5;
  const _tool = isVite ? 'vite' : 'webpack';

  yield { text: `$ npm run build`, style: 'bold', delay: 100 };
  yield { text: '', delay: 50 };

  if (isVite) {
    yield {
      text: `vite v5.${randomInt(0, 4)}.${randomInt(0, 10)} building for production...`,
      style: 'cyan',
      delay: 200,
    };
    yield { text: `transforming...`, style: 'dim', delay: 300 };

    const modules = randomInt(100, 500);
    for (let i = 0; i <= 100; i += randomInt(10, 25)) {
      const actual = Math.min(i, 100);
      yield {
        text: `✓ ${Math.floor((modules * actual) / 100)} modules transformed.`,
        style: 'default',
        delay: randomInt(100, 300),
        replacePrevious: i > 0,
      };
    }

    yield { text: `rendering chunks...`, style: 'dim', delay: 200 };
    yield { text: `computing gzip size...`, style: 'dim', delay: 300 };
    yield { text: '', delay: 100 };
    yield {
      text: `dist/index.html                  ${randomInt(1, 5)}.${randomInt(10, 99)} kB`,
      style: 'default',
      delay: 50,
    };
    yield {
      text: `dist/assets/index-${randomHash()}.css   ${randomInt(10, 50)}.${randomInt(10, 99)} kB │ gzip: ${randomInt(3, 15)}.${randomInt(10, 99)} kB`,
      style: 'default',
      delay: 50,
    };
    yield {
      text: `dist/assets/index-${randomHash()}.js    ${randomInt(100, 400)}.${randomInt(10, 99)} kB │ gzip: ${randomInt(30, 120)}.${randomInt(10, 99)} kB`,
      style: 'default',
      delay: 50,
    };
    yield { text: '', delay: 100 };
    yield {
      text: `✓ built in ${randomInt(2, 8)}.${randomInt(10, 99)}s`,
      style: 'green',
      delay: 200,
    };
  } else {
    yield { text: `> webpack --mode production`, style: 'dim', delay: 200 };
    yield { text: '', delay: 100 };

    const _modules = randomInt(200, 800);
    for (let percent = 0; percent <= 100; percent += randomInt(8, 20)) {
      const actual = Math.min(percent, 100);
      const step =
        actual < 30
          ? 'building'
          : actual < 60
            ? 'sealing'
            : actual < 90
              ? 'optimizing'
              : 'emitting';
      yield {
        text: `${actual}% ${step}...`,
        style: 'cyan',
        delay: randomInt(200, 600),
        replacePrevious: percent > 0,
      };
    }

    yield { text: '', delay: 100 };
    yield {
      text: `asset main.${randomHash()}.js ${randomInt(200, 600)} KiB [emitted] [minimized] (name: main)`,
      style: 'default',
      delay: 100,
    };
    yield {
      text: `asset vendor.${randomHash()}.js ${randomInt(100, 300)} KiB [emitted] [minimized] (name: vendor)`,
      style: 'default',
      delay: 50,
    };
    yield {
      text: `asset styles.${randomHash()}.css ${randomInt(20, 80)} KiB [emitted] (name: styles)`,
      style: 'default',
      delay: 50,
    };
    yield { text: '', delay: 100 };
    yield {
      text: `webpack compiled successfully in ${randomInt(5, 20)}${randomInt(100, 999)} ms`,
      style: 'green',
      delay: 200,
    };
  }

  yield { text: '', delay: 300 };
}

/**
 * Generate fake database migration output
 */
export async function* generateDbMigration(): AsyncGenerator<OutputLine> {
  const tool = randomItem(['prisma', 'typeorm', 'sequelize', 'knex']);

  yield { text: `$ npx ${tool} migrate`, style: 'bold', delay: 100 };
  yield { text: '', delay: 100 };

  if (tool === 'prisma') {
    yield { text: `Prisma schema loaded from prisma/schema.prisma`, style: 'dim', delay: 200 };
    yield {
      text: `Datasource "db": PostgreSQL database "myapp", schema "public"`,
      style: 'dim',
      delay: 150,
    };
    yield { text: '', delay: 100 };

    const migrations = randomInt(2, 5);
    for (let i = 0; i < migrations; i++) {
      const name = randomItem(migrationNames);
      const timestamp = Date.now() - randomInt(1000000, 10000000);
      yield {
        text: `Applying migration \`${timestamp}_${name}\``,
        style: 'cyan',
        delay: randomInt(300, 800),
      };
    }

    yield { text: '', delay: 100 };
    yield { text: `✔ ${migrations} migrations applied successfully.`, style: 'green', delay: 200 };
  } else {
    const migrations = randomInt(3, 7);
    yield { text: `Running ${migrations} pending migrations...`, style: 'default', delay: 200 };
    yield { text: '', delay: 100 };

    for (let i = 0; i < migrations; i++) {
      const name = randomItem(migrationNames);
      yield { text: `  ↑ ${name}`, style: 'cyan', delay: randomInt(200, 600) };
    }

    yield { text: '', delay: 100 };
    yield { text: `✓ All migrations completed`, style: 'green', delay: 200 };
  }

  yield { text: '', delay: 300 };
}

/**
 * Generate fake test run output
 */
export async function* generateTestRun(): AsyncGenerator<OutputLine> {
  const tool = randomItem(['jest', 'vitest', 'mocha']);
  const files = testFiles.slice(0, randomInt(4, 8));

  yield { text: `$ npm test`, style: 'bold', delay: 100 };
  yield { text: '', delay: 100 };

  if (tool === 'jest' || tool === 'vitest') {
    for (const file of files) {
      const tests = randomInt(3, 12);
      const passed = tests - randomInt(0, 1);
      const failed = tests - passed;

      yield {
        text: ` ${failed > 0 ? '✗' : '✓'} ${file}`,
        style: failed > 0 ? 'red' : 'green',
        delay: randomInt(200, 800),
      };

      for (let i = 0; i < tests; i++) {
        const isPassing = i < passed;
        const testName = `should ${randomItem(['return', 'handle', 'validate', 'process', 'create', 'update', 'delete'])} ${randomItem(['user', 'data', 'request', 'response', 'error', 'input'])} ${randomItem(['correctly', 'successfully', 'properly', 'as expected'])}`;
        yield {
          text: `   ${isPassing ? '✓' : '✗'} ${testName} (${randomInt(1, 50)}ms)`,
          style: isPassing ? 'dim' : 'red',
          delay: randomInt(50, 150),
        };
      }
    }

    const totalTests = files.length * 6;
    const totalPassed = totalTests - randomInt(0, 2);

    yield { text: '', delay: 200 };
    yield {
      text: `Test Suites: ${totalPassed === totalTests ? `${files.length} passed` : `${files.length - 1} passed, 1 failed`}, ${files.length} total`,
      style: totalPassed === totalTests ? 'green' : 'yellow',
      delay: 100,
    };
    yield {
      text: `Tests:       ${totalPassed} passed, ${totalTests} total`,
      style: 'default',
      delay: 50,
    };
    yield {
      text: `Time:        ${randomInt(2, 15)}.${randomInt(100, 999)}s`,
      style: 'dim',
      delay: 50,
    };
  } else {
    yield { text: `  ${files.length} passing (${randomInt(2, 10)}s)`, style: 'green', delay: 500 };
  }

  yield { text: '', delay: 300 };
}

/**
 * Generate fake Kubernetes deployment output
 */
export async function* generateK8sDeploy(): AsyncGenerator<OutputLine> {
  const resource = randomItem(k8sResources);
  const [kind, name] = resource.split('/');

  yield { text: `$ kubectl apply -f k8s/`, style: 'bold', delay: 100 };

  const resources = randomInt(3, 8);
  for (let i = 0; i < resources; i++) {
    const res = randomItem(k8sResources);
    const action = randomItem(['created', 'configured', 'unchanged']);
    yield {
      text: `${res} ${action}`,
      style: action === 'created' ? 'green' : action === 'configured' ? 'yellow' : 'dim',
      delay: randomInt(100, 300),
    };
  }

  yield { text: '', delay: 200 };
  yield { text: `$ kubectl rollout status ${kind}/${name}`, style: 'bold', delay: 100 };

  const replicas = randomInt(2, 5);
  for (let i = 1; i <= replicas; i++) {
    yield {
      text: `Waiting for deployment "${name}" rollout to finish: ${i - 1} of ${replicas} updated replicas are available...`,
      style: 'dim',
      delay: randomInt(500, 1500),
      replacePrevious: i > 1,
    };
  }

  yield { text: `deployment "${name}" successfully rolled out`, style: 'green', delay: 200 };
  yield { text: '', delay: 300 };
}

/**
 * Generate fake API call logs
 */
export async function* generateApiCalls(): AsyncGenerator<OutputLine> {
  yield { text: `$ curl -X GET https://api.example.com/health`, style: 'bold', delay: 100 };
  yield { text: `{"status":"healthy","version":"2.1.0"}`, style: 'green', delay: 200 };
  yield { text: '', delay: 200 };

  const calls = randomInt(5, 12);
  yield { text: `Sending ${calls} API requests...`, style: 'dim', delay: 100 };
  yield { text: '', delay: 100 };

  for (let i = 0; i < calls; i++) {
    const method = randomItem(['GET', 'POST', 'PUT', 'DELETE']);
    const endpoint = randomItem(apiEndpoints);
    const status = randomItem([200, 200, 200, 201, 204, 400, 404, 500]);
    const time = randomInt(20, 500);

    const statusStyle = status < 300 ? 'green' : status < 400 ? 'yellow' : 'red';
    yield {
      text: `  ${method.padEnd(6)} ${endpoint.padEnd(25)} ${status} ${time}ms`,
      style: statusStyle,
      delay: randomInt(100, 400),
    };
  }

  yield { text: '', delay: 100 };
  yield { text: `✓ API health check completed`, style: 'green', delay: 200 };
  yield { text: '', delay: 300 };
}

/**
 * Get all available fake command generators
 */
export function getAllCommands(): FakeCommand[] {
  return [
    { name: 'npm install', output: generateNpmInstall, duration: 3000 },
    { name: 'docker pull', output: generateDockerPull, duration: 5000 },
    { name: 'git operations', output: generateGitOperations, duration: 2000 },
    { name: 'webpack build', output: generateWebpackBuild, duration: 4000 },
    { name: 'database migration', output: generateDbMigration, duration: 3000 },
    { name: 'test run', output: generateTestRun, duration: 6000 },
    { name: 'k8s deploy', output: generateK8sDeploy, duration: 4000 },
    { name: 'api calls', output: generateApiCalls, duration: 3000 },
  ];
}

/**
 * Get a random command from all available commands
 */
export function getRandomCommand(): FakeCommand {
  return randomItem(getAllCommands());
}
