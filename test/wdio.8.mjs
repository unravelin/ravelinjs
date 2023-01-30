import path from 'path';
import { launchProxy, app } from './server.mjs';
import { fileURLToPath } from 'url';
import { SevereServiceError } from 'webdriverio';
import { GitHubStatus, build } from './ci.mjs';

const port = 9998;
const user = process.env.BROWSERSTACK_USERNAME;
const key = process.env.BROWSERSTACK_ACCESS_KEY;
if (!user || !key) {
  throw new Error('Envvars BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set.')
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function filterCaps(caps) {
  if (process.env.BROWSERS) {
    const toks = process.env.BROWSERS.toLowerCase().split(',');
    caps = caps.filter(v => {
      const j = JSON.stringify(v).toLowerCase();
      for (const tok of toks) {
        if (!j.includes(tok)) {
          return false;
        }
      }
      return true;
    });
  }

  if (process.env.LIMIT) {
    const lim = parseInt(process.env.LIMIT, 10);
    if (!lim) throw new Error('LIMIT envvar cannot be parsed as integer');
    caps = caps.slice(0, lim);
  }

  return caps;
}

function buildConfig() {
  return {
    runner: 'local',

    // =================
    // Service Providers
    // =================
    user: process.env.BROWSERSTACK_USERNAME,
    key: process.env.BROWSERSTACK_ACCESS_KEY,
    services: [
      // Launch the test API server, an ngrok tunnel, set some defaults, and
      // send updates to GitHub.
      [RavelinJSServerLauncher],
      // Launch the browserstack local tunnel and create selenium sessions.
      ['browserstack', {
        browserstackLocal: true,
        setSessionName: false,
        opts: {
          kill: true,
          force: true,
          localProxyHost: 'localhost',
          localProxyPort: port,
          'disable-dashboard': true,
        },
      }],
    ],

    // ==================
    // Specify Test Files
    // ==================
    // Define which test specs should run. The pattern is relative to the
    // directory from which `wdio` was called.
    //
    // The specs are defined as an array of spec files (optionally using wildcards
    // that will be expanded). The test for each spec file will be run in a
    // separate worker process. In order to have a group of spec files run in the
    // same worker process enclose them in an array within the specs array.
    //
    // If you are calling `wdio` from an NPM script (see
    // https://docs.npmjs.com/cli/run-script), then the current working directory
    // is where your `package.json` resides, so `wdio` will be called from there.
    specs: [
      path.join(__dirname, '*/*.spec.mjs'),
    ],
    // Patterns to exclude.
    exclude: [],

    // ===================
    // Test Configurations
    // ===================
    // Define all options that are relevant for the WebdriverIO instance here.

    // Level of logging verbosity: trace | debug | info | warn | error | silent
    logLevel: process.env.LOG_LEVEL || 'info',

    // Set specific log levels per logger
    // use 'silent' level to disable logger
    // logLevels: {
    //     webdriver: 'info',
    //     '@wdio/appium-service': 'info'
    // },

    // Set directory to store all logs into
    outputDir: __dirname,

    // If you only want to run your tests until a specific amount of tests have
    // failed use bail (default is 0 - don't bail, run all tests).
    bail: parseInt(process.env.BAIL, 10) || 0,

    // Set a base URL in order to shorten `url()` command calls. If your `url`
    // parameter starts with `/`, the `baseUrl` is prepended, not including the
    // path portion of `baseUrl`. If your `url` parameter starts without a scheme
    // or `/` (like `some/path`), the `baseUrl` gets prepended directly.
    baseUrl: 'http://bs-local.com',

    // Default timeout for all waitForXXX commands.
    waitforTimeout: 1000,

    // Add files to watch (e.g. application code or page objects) when running
    // `wdio` command with `--watch` flag. Globbing is supported.
    filesToWatch: [
        // e.g. rerun tests if I change my application code
        // './app/**/*.js'
    ],

    // Framework you want to run your specs with. The following are supported:
    // 'mocha', 'jasmine', and 'cucumber' See also:
    // https://webdriver.io/docs/frameworks.html
    //
    // Make sure you have the wdio adapter package for the specific framework
    // installed before running any tests.
    framework: 'mocha',

    // The number of times to retry the entire specfile when it fails as a whole.
    specFileRetries: 0,
    // Delay in seconds between the spec file retry attempts.
    specFileRetriesDelay: 0,
    // Whether or not retried specfiles should be retried immediately or deferred
    // to the end of the queue.
    specFileRetriesDeferred: true,

    // Test reporter for stdout. The only one supported by default is 'dot'.
    // See also: https://webdriver.io/docs/dot-reporter.html , and click on
    // 'Reporters' in left column.
    reporters: ['dot'],

    // Options to be passed to Mocha.
    // See the full list at: http://mochajs.org
    mochaOpts: {
      ui: 'bdd',
      timeout: 600000,
    },

    // For convenience, if ts-node or @babel/register modules are detected
    // they are automatically loaded for config parsing so that TypeScript and
    // future ES features can be used in wdio configs, and are also
    // automatically loaded for test running so that tests can be written
    // using TypeScript and future ES features.
    // Because this may not be ideal in every situation, the following options
    // may be used to customize the loading for test running, incase it has
    // other requirements.
    autoCompileOpts: {
        // To disable auto-loading entirely set this to false.
        autoCompile: true, // <boolean> Disable this to turn off autoloading. Note: When disabling, you will need to handle calling any such libraries yourself.

        // If you have ts-node installed, you can customize how options are passed
        // to it here: Any valid ts-node config option is allowed. Alternatively
        // the ENV Vars could also be used instead of this. See also:
        // https://github.com/TypeStrong/ts-node#cli-and-programmatic-options See
        // also RegisterOptions in
        // https://github.com/TypeStrong/ts-node/blob/master/src/index.ts
        tsNodeOpts: {
            transpileOnly: true,
            project: 'tsconfig.json'
        },
        // If @babel/register is installed, you can customize how options are
        // passed to it here: Any valid @babel/register config option is allowed.
        // https://babeljs.io/docs/en/babel-register#specifying-options
        babelOpts: {
            ignore: []
        },
    },

    // ============
    // Capabilities
    // ============
    // Define your capabilities here. WebdriverIO can run multiple capabilities at
    // the same time. Depending on the number of capabilities, WebdriverIO
    // launches several test sessions. Within your `capabilities`, you can
    // overwrite the `spec` and `exclude` options in order to group specific specs
    // to a specific capability.

    // First, you can define how many instances should be started at the same
    // time. Let's say you have 3 different capabilities (Chrome, Firefox, and
    // Safari) and you have set `maxInstances` to 1. wdio will spawn 3 processes.
    //
    // Therefore, if you have 10 spec files and you set `maxInstances` to 10, all
    // spec files will be tested at the same time and 30 processes will be
    // spawned.
    //
    // The property handles how many capabilities from the same test should run
    // tests.
    maxInstances: parseInt(process.env.PARALLEL, 10) || 1,
    // Or set a limit to run tests with a specific capability.
    maxInstancesPerCapability: 10,

    // Inserts WebdriverIO's globals (e.g. `browser`, `$` and `$$`) into the
    // global environment. If you set to `false`, you should import from
    // `@wdio/globals`. Note: WebdriverIO doesn't handle injection of test
    // framework specific globals.
    injectGlobals: true,

    // Additional list of node arguments to use when starting child processes.
    execArgv: [],

    // If you have trouble getting all important capabilities together, check out the
    // BrowserStack platform configurator - a great tool to configure your capabilities:
    // https://www.browserstack.com/automate/capabilities?tag=selenium-4.
    capabilities: filterCaps([
      // Internet Explorer.
      {
        'browserName': 'IE',
        'browserVersion': '11.0',
        'bstack:options': {
          'os': 'Windows',
          'osVersion': '10',
          'sendKeys': true,
        },
      },
      {
        'browserName': 'IE',
        'browserVersion': '10.0',
        'bstack:options': {
          'os': 'Windows',
          'osVersion': '8',
          'sendKeys': true,
          'seleniumVersion': '3.5.2',
        },
      },
      {
        'browserName': 'IE',
        'browserVersion': '9.0',
        'bstack:options': {
          'os': 'Windows',
          'osVersion': '7',
          'sendKeys': true,
          'seleniumVersion': '3.5.2',
        },
      },
      {
        'browserName': 'IE',
        'browserVersion': '8.0',
        'bstack:options': {
          'os': 'Windows',
          'osVersion': '7',
          'sendKeys': true,
          'seleniumVersion': '3.5.2',
        },
      },

      // Android
      // Reminder set for 16-01-2023 to uncomment this next block and check if
      // BROWSERS=s6 npm run test:integration passes. If so, open a PR :)
      // {
      //   'bstack:options': {
      //     'osVersion': '5.0',
      //     'deviceName': 'Samsung Galaxy S6',
      //     'realMobile': 'true'
      //   },
      //   'browserName': 'Android'
      // },
      {
        'bstack:options': {
          'osVersion': '7.0',
          'deviceName': 'Samsung Galaxy S8',
          'realMobile': 'true',
        },
        'browserName': 'Android'
      },

      // iOS
      // iOS11 currently failing to start with 'COULD NOT START MOBILE BROWSER'.
      // https://automate.browserstack.com/dashboard/v2/builds/2840b7364373dc5f6f27be58d7bb33374d492668?overallStatus=error
      // {
      //   'bstack:options': {
      //     'osVersion': '11',
      //     'deviceName': 'iPhone 8',
      //     'realMobile': 'true',
      //   },
      //   'browserName': 'iPhone',
      // },
      {
        'browserName': 'iPhone',
        'bstack:options': {
          'osVersion': '12',
          'deviceName': 'iPhone 8',
          'realMobile': 'true',
        },
      },
      {
        'browserName': 'iPhone',
        'bstack:options': {
          'osVersion': '13',
          'deviceName': 'iPhone 8',
          'realMobile': 'true',
        },
      },
      {
        'browserName': 'iPhone',
        'bstack:options': {
          'osVersion': '14',
          'deviceName': 'iPhone 11',
          'realMobile': 'true',
        },
      },

      // Chrome.
      {
        'browserVersion': 'beta',
        'browserName': 'Chrome',
        'bstack:options': {
          'os': 'Windows',
          'osVersion': '10',
        },
      },
      {
        'browserVersion': 'latest',
        'browserName': 'Chrome',
        'bstack:options': {
          'os': 'OS X',
          'osVersion': 'Mojave',
        },
      },
      {
        'browserVersion': '40.0',
        'browserName': 'Chrome',
        'bstack:options': {
          'os': 'OS X',
          'osVersion': 'Mojave',
          'seleniumVersion': '3.14.0',
        },
      },

      // Safari.
      {
        'browserName': 'Safari',
        'browserVersion': '13.0',
        'bstack:options': {
          'os': 'OS X',
          'osVersion': 'Catalina',
        },
      },
      // Finding that High Sierra isn't starting properly:
      // https://automate.browserstack.com/dashboard/v2/builds/ffecf909566a3dd424c71404338350fe6ccecabf/sessions/8fb5ed210e940700b992559292c8516ca3fc33e3
      // {
      //   'bstack:options': {
      //     'os': 'OS X',
      //     'osVersion': 'High Sierra',
      //   },
      //   'browserName': 'Safari',
      //   'browserVersion': '11.0',
      // },
      {
        'browserName': 'Safari',
        'browserVersion': '7.1',
        'bstack:options': {
          'os': 'OS X',
          'osVersion': 'Mavericks',
          'seleniumVersion': '3.14.0',
        },
      },

      // Firefox.
      {
        'browserName': 'Firefox',
        'browserVersion': 'latest',
        'bstack:options': {
          'os': 'Windows',
          'osVersion': '11',
        },
      },
    ]),
  };
}

/**
 * The hooks available to a service added to the config.
 * @typedef {import("@wdio/types").Services.HookFunctions} HookFunctions
 */

/**
 * @implements {HookFunctions}
 */
class RavelinJSServerLauncher {
  constructor() {
    this.build = build();
    this.counts = {
      caps: 0,
      specs: 0,
      total: 0,
      running: 0,
      finished: 0,
      passed: 0,
      failed: 0,
    };
    this.specs = new Set();
    this.gh = new GitHubStatus({
      context: 'browserstack',
      sha: process.env.COMMIT_SHA,
      repo: process.env.HEAD_REPO_URL,
      token: process.env.GITHUB_TOKEN,
    });
  }

  async onPrepare(config, caps) {
    // TODO: Match all the files to config.specs and use that as a count
    // from the very beginning.
    try {
      // Launch our local server and ngrok proxy.
      const api = await launchProxy(app(), port);
      process.env.TEST_INTERNAL = api.internal;
      process.env.TEST_LOCAL = config.baseUrl;
      process.env.TEST_REMOTE = api.remote;

      // Set default properties on the capabilities.
      const b = await this.build;
      caps.forEach(c => {
        c['bstack:options'] ||= {};
        const bs = c['bstack:options'];

        bs.projectName = 'ravelinjs';
        bs.buildName = b;

        if (bs.realMobile !== 'true') {
          bs.seleniumVersion ??= '4.7.2';
        }
        // bs.debug ??= true;
        bs.networkLogs ??= true;
        bs.consoleLogs ??= 'verbose';
      });
    } catch(err) {
      throw new SevereServiceError(err);
    }

    // Initiate the post to GitHub.
    this.counts.caps = caps.length;
    this._ghInitPvt();
    this._ghInitPublic();
  }

  async onWorkerStart(cid, cap, specs, args, execArgv) {
    try {
      // Set a session title.
      const o = cap['bstack:options'];
      o.sessionName = [
        specs && specs[0].split('/').pop(),
        '-',
        cap.browserName,
        cap.browserVersion, o.browserVersion,
        '-',
        o.os, cap.os, !o.os && cap.browserName == 'iPhone' && 'iOS',
        o.osVersion, cap.os_version,
        '-',
        o.deviceName,
      ].filter(Boolean).join(" ").replace(/^[ -]+|[ -]+$/g, '');

      // Estimate how many tasks there are.
      for (let spec of specs) {
        this.specs.add(spec);
      }
      this.counts.specs = this.specs.size;
      this.counts.total = this.counts.caps * this.counts.specs;
      this.counts.running++;
      this.ghUpdate('pending');
    } catch(err) {
      throw new SevereServiceError(err);
    }
  }

  onWorkerEnd(cid, exitCode, specs, retries) {
    this.counts.running--;
    this.counts.finished++;
    if (exitCode == 0) {
      this.counts.passed++;
    } else {
      this.counts.failed++;
    }
    this.ghUpdate('pending');
  }

  async onComplete(exitCode, config, capabilities, results) {
    this.counts = {...this.counts, ...results};
    this.ghUpdate(exitCode ? 'failure' : 'success');
  }

  async ghUpdate(state) {
    return this.gh.update({
      state: state,
      description: JSON.stringify(this.counts),
    });
  }

  /**
   * Construct the private build URL from data we've already got and give it
   * github for inclusion on commit statuses. Overridden by _ghInitPublic.
   */
  async _ghInitPvt() {
    const b = await this.build;
    const url = 'https://automate.browserstack.com/dashboard/v2/search?type=builds&query=' + encodeURIComponent(b);
    console.log('🤖 ' + url);
    this.gh.setTarget(0, url);
  }

  /**
   * Poll the browserstack API to find the public URL of our build and give
   * it to the github client for inclusion on commit statuses, overriding
   * any URL generated by _ghInitPvt.
   */
  async _ghInitPublic() {
    const buildName = await this.build;
    const gh = this.gh;
    setTimeout(findBuild, 2000);
    function findBuild() {
      fetch(
        'https://api.browserstack.com/automate/builds.json',
        {headers: {'Authorization': 'Basic '+Buffer.from(user + ':' + key).toString('base64')}}
      )
      .then(res => {
        if (!res.ok) throw new Error(res.url + ' returned status ' + res.statusCode);
        return res.json();
      })
      .then(builds => Array.isArray(builds) && builds.filter(b => b.automation_build && b.automation_build.name == buildName).pop())
      .then(build => build
        ? gh.setTarget(1, build.automation_build.public_url)
        : setTimeout(findBuild, 1000))
      .catch(err => {
        console.error('Error fetching browserstack builds list', err);
        setTimeout(findBuild, 1000);
      });
    }
  }
}

export const config = buildConfig();
