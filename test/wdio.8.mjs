import path from 'path';
import { launchProxy, app } from './server.mjs';
import { fileURLToPath } from 'url';
import { SevereServiceError } from 'webdriverio';

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

export const config = {
  runner: 'local',

  // =====================
  // Server Configurations
  // =====================
  // Host address of the running Selenium server. This information is usually
  // obsolete, as WebdriverIO automatically connects to localhost. Also if you
  // are using one of the supported cloud services like Sauce Labs,
  // Browserstack, Testing Bot or LambdaTest, you also don't need to define host
  // and port information (because WebdriverIO can figure that out from your
  // user and key information). However, if you are using a private Selenium
  // backend, you should define the `hostname`, `port`, and `path` here.
  //
  // hostname: 'localhost',
  // port: 4444,
  // path: '/',
  // Protocol: http | https
  // protocol: 'http',

  // =================
  // Service Providers
  // =================
  // WebdriverIO supports Sauce Labs, Browserstack, Testing Bot and LambdaTest.
  // (Other cloud providers should work, too.) These services define specific
  // `user` and `key` (or access key) values you must put here, in order to
  // connect to these services.
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  services: [
    [class RavelinJSServerLauncher {
      async onPrepare(config, capabilities) {
        try {
          const api = await launchProxy(app(), port);
          process.env.TEST_INTERNAL = api.internal;
          process.env.TEST_LOCAL = config.baseUrl;
          process.env.TEST_REMOTE = api.remote;
        } catch(err) {
          throw new SevereServiceError(err);
        }
      }
    }],
    ['browserstack', {
      browserstackLocal: true,
      opts: {
        kill: true,
        force: true,
        localProxyHost: 'localhost',
        localProxyPort: port,
        'disable-dashboard': true,
      },
    }],
  ],

  // If you run your tests on Sauce Labs you can specify the region you want to
  // run your tests in via the `region` property. Available short handles for
  // regions are `us` (default) and `eu`. These regions are used for the Sauce
  // Labs VM cloud and the Sauce Labs Real Device Cloud. If you don't provide
  // the region, it defaults to `us`.
  //
  // region: 'eu',
  //
  // Sauce Labs provides a [headless
  // offering](https://saucelabs.com/products/web-testing/sauce-headless-testing)
  // that allows you to run Chrome and Firefox tests headless.
  //
  // headless: false,

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
  // outputDir: __dirname,

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

  // =====
  // Hooks
  // =====
  // WebdriverIO provides a several hooks you can use to interfere the test
  // process in order to enhance it and build services around it. You can either
  // apply a single function to it or an array of methods. If one of them
  // returns with a promise, WebdriverIO will wait until that promise is
  // resolved to continue.

  /**
   * Gets executed once before all workers get launched.
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   */
  onPrepare: [
    async function setupCapabilities(config, caps) {
      // Filter capabilities but those which match process.env.BROWSER.
      // Limit capabilities according to process.env.LIMIT.
      // Set default properties on the capabilities.
      caps.forEach(c => {
        c['bstack:options'] ||= {};
        const bs = c['bstack:options'];

        if (bs.realMobile !== 'true') {
          bs.seleniumVersion ??= '4.7.2';
        }
        // bs.debug ??= true;
        bs.networkLogs ??= true;
        bs.consoleLogs ??= 'verbose';
      });
    },
  ],

  // /**
  //  * Gets executed before a worker process is spawned and can be used to initialize specific service
  //  * for that worker as well as modify runtime environments in an async fashion.
  //  * @param  {String} cid      capability id (e.g 0-0)
  //  * @param  {[type]} caps     object containing capabilities for session that will be spawn in the worker
  //  * @param  {[type]} specs    specs to be run in the worker process
  //  * @param  {[type]} args     object that will be merged with the main configuration once worker is initialized
  //  * @param  {[type]} execArgv list of string arguments passed to the worker process
  //  */
  // onWorkerStart: function (cid, caps, specs, args, execArgv) {
  //   console.log('onWorkerStart', cid, caps, specs, args, execArgv);
  // },
  // /**
  //  * Gets executed after a worker process has exited.
  //  * @param  {String} cid      capability id (e.g 0-0)
  //  * @param  {Number} exitCode 0 - success, 1 - fail
  //  * @param  {[type]} specs    specs to be run in the worker process
  //  * @param  {Number} retries  number of retries used
  //  */
  // onWorkerEnd: function (cid, exitCode, specs, retries) {
  //   console.log('onWorkerEnd', cid, exitCode, specs, retries);
  // },
  // /**
  //  * Gets executed before initializing the webdriver session and test framework. It allows you
  //  * to manipulate configurations depending on the capability or spec.
  //  * @param {Object} config wdio configuration object
  //  * @param {Array.<Object>} capabilities list of capabilities details
  //  * @param {Array.<String>} specs List of spec file paths that are to be run
  //  */
  // beforeSession: function (config, capabilities, specs) {
  //   console.log('beforeSession', config, capabilities, specs);
  // },
  // /**
  //  * Gets executed before test execution begins. At this point you can access to all global
  //  * variables like `browser`. It is the perfect place to define custom commands.
  //  * @param {Array.<Object>} capabilities list of capabilities details
  //  * @param {Array.<String>} specs        List of spec file paths that are to be run
  //  * @param {Object}         browser      instance of created browser/device session
  //  */
  // before: function (capabilities, specs, browser) {
  //   console.log('before', capabilities, specs, browser);
  // },
  // /**
  //  * Gets executed before the suite starts.
  //  * @param {Object} suite suite details
  //  */
  // beforeSuite: function (suite) {
  //   console.log('beforeSuite', suite);
  // },
  // /**
  //  * This hook gets executed _before_ every hook within the suite starts.
  //  * (For example, this runs before calling `before`, `beforeEach`, `after`, `afterEach` in Mocha.). In Cucumber `context` is the World object.
  //  *
  //  */
  // beforeHook: function (test, context) {
  //   console.log('beforeHook', test, context);
  // },
  // /**
  //  * Hook that gets executed _after_ every hook within the suite ends.
  //  * (For example, this runs after calling `before`, `beforeEach`, `after`, `afterEach` in Mocha.). In Cucumber `context` is the World object.
  //  */
  // afterHook: function (test, context, { error, result, duration, passed, retries }) {
  //   console.log('afterHook', test, context, { error, result, duration, passed, retries });
  // },
  // /**
  //  * Function to be executed before a test (in Mocha/Jasmine only)
  //  * @param {Object} test    test object
  //  * @param {Object} context scope object the test was executed with
  //  */
  // beforeTest: function (test, context) {
  //   console.log('beforeTest', test, context);
  // },
  // /**
  //  * Runs before a WebdriverIO command is executed.
  //  * @param {String} commandName hook command name
  //  * @param {Array} args arguments that the command would receive
  //  */
  // beforeCommand: function (commandName, args) {
  //   console.log('beforeCommand', commandName, args);
  // },
  // /**
  //  * Runs after a WebdriverIO command gets executed
  //  * @param {String} commandName hook command name
  //  * @param {Array} args arguments that command would receive
  //  * @param {Number} result 0 - command success, 1 - command error
  //  * @param {Object} error error object, if any
  //  */
  // afterCommand: function (commandName, args, result, error) {
  //   console.log('afterCommand', commandName, args, result, error);
  // },
  // /**
  //  * Function to be executed after a test (in Mocha/Jasmine only)
  //  * @param {Object}  test             test object
  //  * @param {Object}  context          scope object the test was executed with
  //  * @param {Error}   result.error     error object in case the test fails, otherwise `undefined`
  //  * @param {Any}     result.result    return object of test function
  //  * @param {Number}  result.duration  duration of test
  //  * @param {Boolean} result.passed    true if test has passed, otherwise false
  //  * @param {Object}  result.retries   informations to spec related retries, e.g. `{ attempts: 0, limit: 0 }`
  //  */
  // afterTest: function (test, context, { error, result, duration, passed, retries }) {
  //   console.log('afterTest', test, context, { error, result, duration, passed, retries });
  // },
  // /**
  //  * Hook that gets executed after the suite has ended.
  //  * @param {Object} suite suite details
  //  */
  // afterSuite: function (suite) {
  //   console.log('afterSuite', suite);
  // },
  // /**
  //  * Gets executed after all tests are done. You still have access to all global variables from
  //  * the test.
  //  * @param {Number} result 0 - test pass, 1 - test fail
  //  * @param {Array.<Object>} capabilities list of capabilities details
  //  * @param {Array.<String>} specs List of spec file paths that ran
  //  */
  // after: function (result, capabilities, specs) {
  //   console.log('after', result, capabilities, specs);
  // },
  // /**
  //  * Gets executed right after terminating the webdriver session.
  //  * @param {Object} config wdio configuration object
  //  * @param {Array.<Object>} capabilities list of capabilities details
  //  * @param {Array.<String>} specs List of spec file paths that ran
  //  */
  // afterSession: function (config, capabilities, specs) {
  //   console.log('afterSession', config, capabilities, specs);
  // },
  // /**
  //  * Gets executed after all workers have shut down and the process is about to exit.
  //  * An error thrown in the `onComplete` hook will result in the test run failing.
  //  * @param {Object} exitCode 0 - success, 1 - fail
  //  * @param {Object} config wdio configuration object
  //  * @param {Array.<Object>} capabilities list of capabilities details
  //  * @param {<Object>} results object containing test results
  //  */
  // onComplete: function (exitCode, config, capabilities, results) {
  //   console.log('onComplete', exitCode, config, capabilities, results);
  // },
  // /**
  // * Gets executed when a refresh happens.
  // * @param {String} oldSessionId session ID of the old session
  // * @param {String} newSessionId session ID of the new session
  // */
  // onReload: function(oldSessionId, newSessionId) {
  //   console.log('onReload', oldSessionId, newSessionId);
  // },
  // /**
  //  * Cucumber Hooks
  //  *
  //  * Runs before a Cucumber Feature.
  //  * @param {String}                   uri      path to feature file
  //  * @param {GherkinDocument.IFeature} feature  Cucumber feature object
  //  */
  // beforeFeature: function (uri, feature) {
  //   console.log('beforeFeature', uri, feature);
  // },
  // /**
  //  *
  //  * Runs before a Cucumber Scenario.
  //  * @param {ITestCaseHookParameter} world    world object containing information on pickle and test step
  //  * @param {Object}                 context  Cucumber World object
  //  */
  // beforeScenario: function (world, context) {
  //   console.log('beforeScenario', world, context);
  // },
  // /**
  //  *
  //  * Runs before a Cucumber Step.
  //  * @param {Pickle.IPickleStep} step     step data
  //  * @param {IPickle}            scenario scenario pickle
  //  * @param {Object}             context  Cucumber World object
  //  */
  // beforeStep: function (step, scenario, context) {
  //   console.log('beforeStep', step, scenario, context);
  // },
  // /**
  //  *
  //  * Runs after a Cucumber Step.
  //  * @param {Pickle.IPickleStep} step             step data
  //  * @param {IPickle}            scenario         scenario pickle
  //  * @param {Object}             result           results object containing scenario results
  //  * @param {boolean}            result.passed    true if scenario has passed
  //  * @param {string}             result.error     error stack if scenario failed
  //  * @param {number}             result.duration  duration of scenario in milliseconds
  //  * @param {Object}             context          Cucumber World object
  //  */
  // afterStep: function (step, scenario, result, context) {
  //   console.log('afterStep', step, scenario, result, context);
  // },
  // /**
  //  *
  //  * Runs after a Cucumber Scenario.
  //  * @param {ITestCaseHookParameter} world            world object containing information on pickle and test step
  //  * @param {Object}                 result           results object containing scenario results `{passed: boolean, error: string, duration: number}`
  //  * @param {boolean}                result.passed    true if scenario has passed
  //  * @param {string}                 result.error     error stack if scenario failed
  //  * @param {number}                 result.duration  duration of scenario in milliseconds
  //  * @param {Object}                 context          Cucumber World object
  //  */
  // afterScenario: function (world, result, context) {
  //   console.log('afterScenario', world, result, context);
  // },
  // /**
  //  *
  //  * Runs after a Cucumber Feature.
  //  * @param {String}                   uri      path to feature file
  //  * @param {GherkinDocument.IFeature} feature  Cucumber feature object
  //  */
  // afterFeature: function (uri, feature) {
  //   console.log('afterFeature', uri, feature);
  // },

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
      /*{
        browserName: 'chrome',
        'goog:chromeOptions': {
        // to run chrome headless the following flags are required
        // (see https://developers.google.com/web/updates/2017/04/headless-chrome)
        // args: ['--headless', '--disable-gpu'],
        }
        //
        // Parameter to ignore some or all default flags
        // - if value is true: ignore all DevTools 'default flags' and Puppeteer 'default arguments'
        // - if value is an array: DevTools filters given default arguments
        // 'wdio:devtoolsOptions': {
        //    ignoreDefaultArgs: true,
        //    ignoreDefaultArgs: ['--disable-sync', '--disable-extensions'],
        // },
    }, {
        // maxInstances can get overwritten per capability. So if you have an in house Selenium
        // grid with only 5 firefox instance available you can make sure that not more than
        // 5 instance gets started at a time.
        maxInstances: 5,
        browserName: 'firefox',
        specs: [
            'test/ffOnly/*'
        ],
        'moz:firefoxOptions': {
          // flag to activate Firefox headless mode (see https://github.com/mozilla/geckodriver/blob/master/README.md#firefox-capabilities for more details about moz:firefoxOptions)
          // args: ['-headless']
        },
        // If outputDir is provided WebdriverIO can capture driver session logs
        // it is possible to configure which logTypes to exclude.
        // excludeDriverLogs: ['*'], // pass '*' to exclude all driver session logs
        excludeDriverLogs: ['bugreport', 'server'],
        //
        // Parameter to ignore some or all Puppeteer default arguments
        // ignoreDefaultArgs: ['-foreground'], // set value to true to ignore all default arguments
    }*/
    // {
    //   // maxInstances can get overwritten per capability. So if you have an in-house Selenium
    //   // grid with only 5 firefox instances available you can make sure that not more than
    //   // 5 instances get started at a time.
    //   maxInstances: 5,
    //
    //   browserName: 'chrome',
    //   acceptInsecureCerts: true
    //   // If outputDir is provided WebdriverIO can capture driver session logs
    //   // it is possible to configure which logTypes to include/exclude.
    //   // excludeDriverLogs: ['*'], // pass '*' to exclude all driver session logs
    //   // excludeDriverLogs: ['bugreport', 'server'],
    // },

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
}
