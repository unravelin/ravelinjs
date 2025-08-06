import chai from 'chai';
import chaiSubset from 'chai-subset';
import { execSync } from 'child_process';
import path from 'path';
import { startServer, stopServer } from './server.mjs';

chai.use(chaiSubset);

// Supress error `BrowserStackLocal: --import is not allowed in NODE_OPTIONS`
process.env.NODE_OPTIONS = '';

function buildConfig() {
  const gitBranchName = generateBuildName();
  const buildId = generateBuildId();

  const config = {
    runner: 'local',
    user: process.env.BROWSERSTACK_USERNAME || 'robcrocombe_s510GM',
    key: process.env.BROWSERSTACK_ACCESS_KEY || 'ioPoeJqDipNm9csFBTXS',
    hostname: 'hub.browserstack.com',
    maxInstances: 5,
    maxInstancesPerCapability: 10,
    injectGlobals: false,
    framework: 'mocha',
    specs: [
      path.join(import.meta.dirname, '/send/*.spec.mjs'),
      path.join(import.meta.dirname, '/encrypt/*.spec.mjs'),
    ],
    services: [
      [RavelinJsServerLauncher, {}],
      [
        'browserstack',
        {
          projectName: 'ravelinjs',
          buildName: gitBranchName,
          buildIdentifier: buildId,
          buildTag: gitBranchName,
          browserstackLocal: true,
          opts: {
            kill: true,
            force: true,
            localProxyHost: 'localhost',
            localProxyPort: 3000,
          },
        },
        {
          testObservabilityOptions: {
            buildName: gitBranchName,
            buildIdentifier: buildId,
            projectName: 'ravelinjs',
            buildTag: gitBranchName,
          },
        },
      ],
    ],
    capabilities: [
      {
        browserName: 'Chrome',
        'bstack:options': {
          browserVersion: 'latest',
          os: 'Windows',
          osVersion: '11',
        },
      },
      {
        browserName: 'Edge',
        'bstack:options': {
          browserVersion: 'latest',
          os: 'Windows',
          osVersion: '11',
        },
      },
      {
        browserName: 'Firefox',
        'bstack:options': {
          browserVersion: 'latest',
          os: 'Windows',
          osVersion: '10',
        },
      },
      {
        browserName: 'IE',
        'bstack:options': {
          browserVersion: '11.0',
          os: 'Windows',
          osVersion: '10',
          sendKeys: true,
        },
      },
      {
        browserName: 'Safari',
        'bstack:options': {
          browserVersion: '18.4',
          os: 'OS X',
          osVersion: 'Sequoia',
        },
      },
      {
        browserName: 'safari',
        'bstack:options': {
          deviceOrientation: 'portrait',
          deviceName: 'iPhone 15',
          osVersion: '17',
        },
      },
      {
        browserName: 'chrome',
        'bstack:options': {
          deviceOrientation: 'portrait',
          deviceName: 'Samsung Galaxy S23',
          osVersion: '13.0',
        },
      },
    ],
    commonCapabilities: {
      'bstack:options': {
        projectName: 'ravelinjs',
        buildName: gitBranchName,
        buildIdentifier: buildId,
        buildTag: gitBranchName,
        debug: 'true',
        networkLogs: 'true',
        consoleLogs: 'verbose',
      },
    },
  };

  config.capabilities.forEach((caps) => {
    for (let i in config.commonCapabilities) {
      caps[i] = { ...caps[i], ...config.commonCapabilities[i] };
    }
  });

  console.log(JSON.stringify(config, null, 2));

  return config;
}

class RavelinJsServerLauncher {
  async onPrepare() {
    return new Promise((resolve) => {
      startServer((tunnelUrl) => {
        process.env.TUNNEL_URL = tunnelUrl;
        resolve();
      });
    });
  }

  async onComplete() {
    return new Promise((resolve) => {
      stopServer(() => {
        resolve();
      });
    });
  }
}

/**
 * @returns {String}
 */
function generateBuildName() {
  if (process.env.E2E_RSA_KEY) {
    return 'auto-integration-tests';
  }
  if (process.env.HEAD_BRANCH) {
    return process.env.HEAD_BRANCH;
  }
  return gitBranch();
}

/**
 * @returns {String}
 */
function generateBuildId() {
  if (process.env.HEAD_BRANCH) {
    const trigger = process.env.E2E_RSA_KEY ? 'e2e' : 'ci';

    // Example: "ci/main/abc-1234/def-5678"
    return `${trigger}/${process.env.HEAD_BRANCH}/${process.env.COMMIT_SHA.substring(0, 7)}/${
      process.env.BUILD_ID
    }`;
  }

  return gitBuildId();
}

/**
 * Returns a description of the git revision of the working directory.
 * @returns {String}
 */
function gitBuildId() {
  try {
    return execSync('git describe --all --long --dirty', { encoding: 'utf8' }).trim();
  } catch (err) {
    throw new Error('git describe: ' + err.message);
  }
}

/**
 * Returns the current git branch.
 * @returns {String}
 */
function gitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (err) {
    throw new Error('git rev-parse: ' + err.message);
  }
}

export const config = buildConfig();
