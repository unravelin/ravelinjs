const path = require('path');
const { launchProxy, app } = require('./server');
const { exec } = require('child_process');
const fetch = require('node-fetch');
const BrowserstackLauncherService = require('@wdio/browserstack-service/build/launcher').default;

const user = process.env.BROWSERSTACK_USERNAME;
const key = process.env.BROWSERSTACK_ACCESS_KEY;
const baseUrl = 'http://bs-local.com';

const browserStackOpts = {
  'disable-dashboard': true,
};

if (!user || !key) {
  throw new Error('Envvars BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set.');
}

const buildP = build();
async function capabilityConstants() {
  const b = await buildP;
  return {
    'project': 'ravelinjs',
    'build': b,
    'browserstack.debug': 'true',
    'browserstack.console': 'verbose',
    'browserstack.networkLogs': 'true',
    'browserstack.networkLogsOptions': {
        captureContent: true
    },
  };
}

class GitHubStatus {
  /**
   * @param {Object} p
   * @param {string} p.sha
   * @param {string} p.repo
   * @param {string} p.token
   * @param {string} p.context
   */
  constructor({sha, repo, token, context}) {
    this.sha = sha;
    this.repo = repo;
    this.token = token;
    this.context = context;
  }

  setTarget(priority, target) {
    if (this.targetPriority > priority) {
      return;
    }

    this.targetPriority = priority;
    this.target = target;

    if (this.lastStatus) {
      this._send(this.lastStatus);
    } else {
      this.update({
        state: 'pending'
      })
    }
  }

  update(status) {
    this.lastStatus = status;
    this._send(status);
  }

  _send(status) {
    status.context = this.context;
    status.target_url = this.target;
    if (status.description && status.description.length > 140) {
      status.description = status.description.substr(0, 140);
    }
    console.log('GitHub', status);

    // Discard.
    if (!this.sha || !this.repo || !this.token) return;

    if (this.controller) this.controller.abort();
    this.controller = new AbortController();

    const api = this.repo.replace(/\/\/github.com\//, '//api.github.com/repos/');
    const apiStatus = api + '/statuses/' + encodeURIComponent(process.env.COMMIT_SHA);
    fetch(apiStatus, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'Authorization': 'Bearer ' + this.token,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(status),
      signal: this.controller.signal,
    })
    .then(async res => {
      if (!res.ok) {
        throw new Error(res.url + ' returned status code ' + res.statusCode + ' and body: ' + (await res.text()));
      }
    })
    .catch(err => {
      console.error('Error updating github commit status', err)
    });
  }
}

const gh = new GitHubStatus({
  context: 'browserstack',
  sha: process.env.COMMIT_SHA,
  repo: process.env._HEAD_REPO_URL,
  token: process.env.GITHUB_TOKEN,
});

exports.config = {
  // ====================
  // Runner Configuration
  // ====================

  // WebdriverIO allows it to run your tests in arbitrary locations (e.g. locally or
  // on a remote machine).
  runner: 'local',

  // ==================
  // Specify Test Files
  // ==================
  // Define which test specs should run. The pattern is relative to the directory
  // from which `wdio` was called. Notice that, if you are calling `wdio` from an
  // NPM script (see https://docs.npmjs.com/cli/run-script) then the current working
  // directory is where your package.json resides, so `wdio` will be called from there.
  specs: [
    path.join(__dirname, '*/*.spec.js'),
  ],
  // Patterns to exclude.
  exclude: [
    // 'path/to/excluded/files'
  ],

  // ============
  // Capabilities
  // ============
  // Define your capabilities here. WebdriverIO can run multiple capabilities at the same
  // time. Depending on the number of capabilities, WebdriverIO launches several test
  // sessions. Within your capabilities you can overwrite the spec and exclude options in
  // order to group specific specs to a specific capability.

  // First, you can define how many instances should be started at the same time. Let's
  // say you have 3 different capabilities (Chrome, Firefox, and Safari) and you have
  // set maxInstances to 1; wdio will spawn 3 processes. Therefore, if you have 10 spec
  // files and you set maxInstances to 10, all spec files will get tested at the same time
  // and 30 processes will get spawned. The property handles how many capabilities
  // from the same test should run tests.
  maxInstances: parseInt(process.env.PARALLEL, 10) || 1,

  // If you have trouble getting all important capabilities together, check out the
  // BrowserStack platform configurator - a great tool to configure your capabilities:
  // https://www.browserstack.com/automate/capabilities?tag=selenium-4
  capabilities: [
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
      "os": "Windows",
      "os_version": "7",
      "browserName": "IE",
      "browser_version": "11.0",
      'browserstack.sendKeys': 'true',
    },
    {
      "os": "Windows",
      "os_version": "7",
      "browserName": "IE",
      "browser_version": "10.0",
      'browserstack.sendKeys': 'true',
    },
    {
      "os": "Windows",
      "os_version": "7",
      "browserName": "IE",
      "browser_version": "9.0",
      'browserstack.sendKeys': 'true',
    },
    {
      "os": "Windows",
      "os_version": "7",
      "browserName": "IE",
      "browser_version": "8.0",
      'browserstack.sendKeys': 'true',
    },

    // Android
    {
      'bstack:options': {
        "osVersion": "5.0",
        "deviceName": "Samsung Galaxy S6",
        "realMobile": "true"
      },
      "browserName": "Android"
    },
    {
      'bstack:options': {
        "osVersion": "7.0",
        "deviceName": "Samsung Galaxy S8",
        "realMobile": "true",
      },
      "browserName": "Android"
    },

    // iOS
    // iOS11 currently failing to start with "COULD NOT START MOBILE BROWSER".
    // https://automate.browserstack.com/dashboard/v2/builds/2840b7364373dc5f6f27be58d7bb33374d492668?overallStatus=error
    // {
    //   'bstack:options': {
    //     "osVersion": "11",
    //     "deviceName": "iPhone 8",
    //     "realMobile": "true",
    //   },
    //   "browserName": "iPhone",
    // },
    {
      'bstack:options': {
        "osVersion": "12",
        "deviceName": "iPhone 8",
        "realMobile": "true",
      },
      "browserName": "iPhone",
    },
    {
      'bstack:options': {
        "osVersion": "13",
        "deviceName": "iPhone 8",
        "realMobile": "true",
      },
      "browserName": "iPhone",
    },
    {
      'bstack:options': {
        "osVersion": "14",
        "deviceName": "iPhone 11",
        "realMobile": "true",
      },
      "browserName": "iPhone",
    },

    // Chrome.
    {
      'bstack:options': {
        "os": "Windows",
        "osVersion": "10",
      },
      "browserName": "Chrome",
      "browserVersion": "beta",
    },
    {
      'bstack:options': {
        "os": "OS X",
        "osVersion": "Mojave",
      },
      "browserName": "Chrome",
      "browserVersion": "latest",
    },
    {
      'bstack:options': {
        "os": "OS X",
        "osVersion": "Mojave",
      },
      "browserName": "Chrome",
      "browserVersion": "40.0",
    },

    // Safari.
    {
      'bstack:options': {
        "os": "OS X",
        "osVersion": "Catalina",
      },
      "browserName": "Safari",
      "browserVersion": "13.0",
    },
    // Finding that High Sierra isn't starting properly:
    // https://automate.browserstack.com/dashboard/v2/builds/ffecf909566a3dd424c71404338350fe6ccecabf/sessions/8fb5ed210e940700b992559292c8516ca3fc33e3
    // {
    //   'bstack:options': {
    //     "os": "OS X",
    //     "osVersion": "High Sierra",
    //   },
    //   "browserName": "Safari",
    //   "browserVersion": "11.0",
    // },
    {
      'bstack:options': {
        "os": "OS X",
        "osVersion": "Mavericks",
      },
      "browserName": "Safari",
      "browserVersion": "7.1",
    },

    // Firefox.
    {
      'bstack:options': {
        "os": "Windows",
        "osVersion": "10",
      },
      "browserName": "Firefox",
      "browserVersion": "latest",
    },
    {
      'bstack:options': {
        "os": "OS X",
        "osVersion": "Mavericks",
      },
      "browserName": "Firefox",
      "browserVersion": "45.0",
    },
  ].filter(function(b) {
    if (!process.env.BROWSERS) {
      return true;
    }
    const j = JSON.stringify(b).toLowerCase();
    const tokens = process.env.BROWSERS.toLowerCase().split(',');
    for (var tok of tokens) {
      if (j.indexOf(tok) === -1) {
        return false;
      }
    }
    return true;
  }),

  // ===================
  // Test Configurations
  // ===================
  // Define all options that are relevant for the WebdriverIO instance here

  // Level of logging verbosity: trace | debug | info | warn | error | silent
  logLevel: process.env.LOG_LEVEL || 'info',

  // Set specific log levels per logger
  // loggers:
  // - webdriver, webdriverio
  // - @wdio/applitools-service, @wdio/browserstack-service, @wdio/devtools-service, @wdio/sauce-service
  // - @wdio/mocha-framework, @wdio/jasmine-framework
  // - @wdio/local-runner, @wdio/lambda-runner
  // - @wdio/sumologic-reporter
  // - @wdio/cli, @wdio/config, @wdio/sync, @wdio/utils
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  // logLevels: {
  //     webdriver: 'info',
  //     '@wdio/applitools-service': 'info'
  // },

  // If you only want to run your tests until a specific amount of tests have failed use
  // bail (default is 0 - don't bail, run all tests).
  bail: 0,

  // Set a base URL in order to shorten url command calls. If your `url` parameter starts
  // with `/`, the base url gets prepended, not including the path portion of your baseUrl.
  // If your `url` parameter starts without a scheme or `/` (like `some/path`), the base url
  // gets prepended directly.
  baseUrl: baseUrl,

  // Default timeout for all waitFor* commands.
  waitforTimeout: 13000,

  // Default timeout in milliseconds for request
  // if browser driver or grid doesn't send response
  connectionRetryTimeout: 120000,

  // Default request retries count
  connectionRetryCount: 3,

  // Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.
  services: [
    // browserstack is not instructed to run browserstack-local here. We
    // run it ourselves in launchTunnels. Note that this will cause
    // "browserstackLocal is not enabled - skipping..." to be logged, but we
    // manually instantiate the tunnel in launchTunnels below.
    ['browserstack', {opts: browserStackOpts}],
  ],
  user: user,
  key: key,

  // Framework you want to run your specs with.
  // The following are supported: Mocha, Jasmine, and Cucumber
  // see also: https://webdriver.io/docs/frameworks.html
  //
  // Make sure you have the wdio adapter package for the specific framework installed
  // before running any tests.
  framework: 'mocha',

  // The number of times to retry the entire specfile when it fails as a whole
  // specFileRetries: 1,

  // Whether or not retried specfiles should be retried immediately or deferred to the end of the queue
  // specFileRetriesDeferred: false,

  // Test reporter for stdout.
  // The only one supported by default is 'dot'
  // see also: https://webdriver.io/docs/dot-reporter.html
  reporters: [
    'spec',
    ['junit', {
      outputDir: path.join(__dirname, '../reports/junit'),
      addFileAttribute: true,
      outputFileFormat: options => `ravelinjs - ${options.capabilities.name}.xml`,
      suiteNameFormat: '.',
    }],
  ],

  // Options to be passed to Mocha.
  // See the full list at http://mochajs.org/
  mochaOpts: {
    ui: 'bdd',
    timeout: 600000,
  },

  //
  // =====
  // Hooks
  // =====
  // WebdriverIO provides several hooks you can use to interfere with the test process in order to enhance
  // it and to build services around it. You can either apply a single function or an array of
  // methods to it. If one of them returns with a promise, WebdriverIO will wait until that promise got
  // resolved to continue.
  /**
   * Gets executed once before all workers get launched.
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   */
  onPrepare: [
    async function launchTunnels(config, caps) {
      const api = await launchProxy(app());
      process.env.TEST_INTERNAL = api.internal;
      process.env.TEST_LOCAL = baseUrl;
      process.env.TEST_REMOTE = api.remote;
      console.log(`🤖 ${api.internal}\n   ↖ ${baseUrl}\n   ↖ ${api.remote}`);

      const bs = new BrowserstackLauncherService({
        browserstackLocal: true,
        opts: {
          localProxyHost: 'localhost',
          localProxyPort: api.internalPort,
          ...browserStackOpts,
        },
      }, caps, config);
      return bs.onPrepare(config, caps);
    },
    function filterLimit(config, capabilities) {
      if (!process.env.LIMIT) return;
      const limit = parseInt(process.env.LIMIT, 10);
      if (limit && limit > 0 && capabilities.length > limit) {
        // Remove capabilities beyond LIMIT count.
        capabilities.splice(limit, capabilities.length - limit);
      }
    },

    async function setCapabilityConstants(config, capabilities) {
      const def = await capabilityConstants();
      capabilities.forEach(cap => Object.assign(cap, def));
    },

    /**
     * Construct the private build URL from data we've already got and give it
     * github for inclusion on commit statuses. Overridden by sharePublicBrowserstackURL.
     */
    async function sharePrivateBrowserstackURL(config, capabilities) {
      const b = await buildP;
      const url = 'https://automate.browserstack.com/dashboard/v2/search?type=builds&query=' + encodeURIComponent(b);
      console.log('🤖 ' + url);
      gh.setTarget(0, url);
    },

    /**
     * Poll the browserstack API to find the public URL of our build and give it
     * to the github client for inclusion on commit statuses, overriding any
     * URL generated by sharePrivateBrowserstackURL.
     */
    async function sharePublicBrowserstackURL(config, capabilities) {
      const buildName = await buildP;
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
    },
  ],
  /**
   * Gets executed before a worker process is spawned and can be used to initialise specific service
   * for that worker as well as modify runtime environments in an async fashion.
   * @param  {String} cid      capability id (e.g 0-0)
   * @param  {[type]} caps     object containing capabilities for session that will be spawn in the worker
   * @param  {[type]} specs    specs to be run in the worker process
   * @param  {[type]} args     object that will be merged with the main configuration once worker is initialised
   * @param  {[type]} execArgv list of string arguments passed to the worker process
   */
  onWorkerStart: function setCapName(cid, caps, specs, args, execArgv) {
    // Set the capability name to describe the spec, browser and os.
    const o = caps["bstack:options"];
    caps.name = [
      specs && specs[0].split('/').pop(),
      '-',
      caps.browserName,
      caps.browserVersion, caps.browser_version,
      '-',
      o && o.os, caps.os, !(o && o.os) && caps.browserName == 'iPhone'  && 'iOS',
      o && o.osVersion, caps.os_version,
      '-',
      o && o.deviceName,
    ].filter(Boolean).join(" ").replace(/^[ -]+|[ -]+$/g, '');
  },
  /**
   * Gets executed just before initialising the webdriver session and test framework. It allows you
   * to manipulate configurations depending on the capability or spec.
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that are to be run
   */
  // beforeSession: function (config, capabilities, specs) {
  // },
  /**
   * Gets executed before test execution begins. At this point you can access to all global
   * variables like `browser`. It is the perfect place to define custom commands.
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that are to be run
   */
  // before: function (capabilities, specs) {
  // },
  /**
   * Runs before a WebdriverIO command gets executed.
   * @param {String} commandName hook command name
   * @param {Array} args arguments that command would receive
   */
  // beforeCommand: function (commandName, args) {
  // },
  /**
   * Hook that gets executed before the suite starts
   * @param {Object} suite suite details
   */
  // beforeSuite: function (suite) {
  // },
  /**
   * Function to be executed before a test (in Mocha/Jasmine) starts.
   */
  // beforeTest: function (test, context) {
  // },
  /**
   * Hook that gets executed _before_ a hook within the suite starts (e.g. runs before calling
   * beforeEach in Mocha)
   */
  // beforeHook: function (test, context) {
  // },
  /**
   * Hook that gets executed _after_ a hook within the suite starts (e.g. runs after calling
   * afterEach in Mocha)
   */
  // afterHook: function (test, context, { error, result, duration, passed, retries }) {
  // },
  /**
   * Function to be executed after a test (in Mocha/Jasmine).
   */
  // afterTest: function(test, context, { error, result, duration, passed, retries }) {
  // },


  /**
   * Hook that gets executed after the suite has ended
   * @param {Object} suite suite details
   */
  // afterSuite: function (suite) {
  // },
  /**
   * Runs after a WebdriverIO command gets executed
   * @param {String} commandName hook command name
   * @param {Array} args arguments that command would receive
   * @param {Number} result 0 - command success, 1 - command error
   * @param {Object} error error object if any
   */
  // afterCommand: function (commandName, args, result, error) {
  // },
  /**
   * Gets executed after all tests are done. You still have access to all global variables from
   * the test.
   * @param {Number} result 0 - test pass, 1 - test fail
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that ran
   */
  // after: function (result, capabilities, specs) {
  // },
  /**
   * Gets executed right after terminating the webdriver session.
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that ran
   */
  // afterSession: function (config, capabilities, specs) {
  // },
  /**
   * Gets executed after all workers got shut down and the process is about to exit. An error
   * thrown in the onComplete hook will result in the test run failing.
   * @param {Object} exitCode 0 - success, 1 - fail
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {<Object>} results object containing test results
   */
  onComplete: function(exitCode, config, capabilities, results) {
    const build = capabilities[0].build;
    console.error('RESULTS', build, results);

    // Avoid updating the build status for e2e runs.
    if (process.env.E2E_RSA_KEY) return;

    gh.update({
      state: exitCode ? 'failure' : 'success',
      description: JSON.stringify(results),
    });
  },
  /**
  * Gets executed when a refresh happens.
  * @param {String} oldSessionId session ID of the old session
  * @param {String} newSessionId session ID of the new session
  */
  //onReload: function(oldSessionId, newSessionId) {
  //}
};

/**
 * build returns an identifier for the build in question.
 */
async function build() {
  if (process.env.HEAD_BRANCH) {
    const trigger = process.env.E2E_RSA_KEY ? 'e2e' : 'ci';
    return trigger + '/' + process.env.HEAD_BRANCH + '-' + process.env.COMMIT_SHA.substring(0, 7) + '-' + process.env.BUILD_ID;
  }
  return await gitBuild();
}

/**
 * gitBuild returns a description of the git revision of the working directory.
 * @returns {Promise}
 */
function gitBuild() {
  return new Promise(function (resolve, reject) {
    exec('git describe --all --long --dirty', function (err, stdout, stderr) {
      if (err) {
        reject('git describe: ' + err + ' stderr: ' + stderr);
        return;
      }
      resolve(stdout.trim());
    });
  });
}
