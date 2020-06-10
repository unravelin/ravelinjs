const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

exports.config = {
    //
    // ==================
    // Specify Test Files
    // ==================
    // Define which test specs should run. The pattern is relative to the directory
    // from which `wdio` was called. Notice that, if you are calling `wdio` from an
    // NPM script (see https://docs.npmjs.com/cli/run-script) then the current working
    // directory is where your package.json resides, so `wdio` will be called from there.
    //
    specs: [
      path.resolve(__dirname, 'specs/test.js'),
    ],
    // Patterns to exclude.
    exclude: [],
    //
    // ============
    // Capabilities
    // ============
    // Define your capabilities here. WebdriverIO can run multiple capabilities at the same
    // time. Depending on the number of capabilities, WebdriverIO launches several test
    // sessions. Within your capabilities you can overwrite the spec and exclude options in
    // order to group specific specs to a specific capability.
    //
    // First, you can define how many instances should be started at the same time. Let's
    // say you have 3 different capabilities (Chrome, Firefox, and Safari) and you have
    // set maxInstances to 1; wdio will spawn 3 processes. Therefore, if you have 10 spec
    // files and you set maxInstances to 10, all spec files will get tested at the same time
    // and 30 processes will get spawned. The property handles how many capabilities
    // from the same test should run tests.
    //
    maxInstances: 10,
    //
    // If you have trouble getting all important capabilities together, check out the
    // Sauce Labs platform configurator - a great tool to configure your capabilities:
    // https://docs.saucelabs.com/reference/platforms-configurator
    //
    // capabilities: [
    //     // {
    //     //     // maxInstances can get overwritten per capability. So if you have an in-house Selenium
    //     //     // grid with only 5 firefox instances available you can make sure that not more than
    //     //     // 5 instances get started at a time.
    //     //     maxInstances: 5,
    //     //     //
    //     //     browserName: 'firefox'
    //     // },
    //     {
    //         "platformName": "iOS",
    //         "deviceName": "iPhone Simulator",
    //         "browserName": "safari",
    //         "automationName": "XCUITest"
    //     },
    // ],
    //
    // ===================
    // Test Configurations
    // ===================
    // Define all options that are relevant for the WebdriverIO instance here
    //
    // By default WebdriverIO commands are executed in a synchronous way using
    // the wdio-sync package. If you still want to run your tests in an async way
    // e.g. using promises you can set the sync option to false.
    sync: true,
    //
    // Level of logging verbosity: silent | verbose | command | data | result | error
    logLevel: process.env.LOG_LEVEL || 'error',
    //
    // Enables colors for log output.
    coloredLogs: true,
    //
    // Warns when a deprecated command is used
    deprecationWarnings: false, // These so-called deprecation warnings are bullshit. There's no alternative...
    //
    // If you only want to run your tests until a specific amount of tests have failed use
    // bail (default is 0 - don't bail, run all tests).
    bail: 0,
    //
    // Saves a screenshot to a given path if a command fails.
    screenshotPath: __dirname + '/shots/',
    //
    // Set a base URL in order to shorten url command calls. If your `url` parameter starts
    // with `/`, the base url gets prepended, not including the path portion of your baseUrl.
    // If your `url` parameter starts without a scheme or `/` (like `some/path`), the base url
    // gets prepended directly.
    baseUrl: 'http://127.0.0.1/',
    //
    // Default timeout for all waitFor* commands.
    waitforTimeout: 10000,
    //
    // Default timeout in milliseconds for request
    // if Selenium Grid doesn't send response
    connectionRetryTimeout: 90000,
    //
    // Default request retries count
    connectionRetryCount: 3,
    //
    // Initialize the browser instance with a WebdriverIO plugin. The object should have the
    // plugin name as key and the desired plugin options as properties. Make sure you have
    // the plugin installed before running any tests. The following plugins are currently
    // available:
    // WebdriverCSS: https://github.com/webdriverio/webdrivercss
    // WebdriverRTC: https://github.com/webdriverio/webdriverrtc
    // Browserevent: https://github.com/webdriverio/browserevent
    // plugins: {
    //     webdrivercss: {
    //         screenshotRoot: 'my-shots',
    //         failedComparisonsRoot: 'diffs',
    //         misMatchTolerance: 0.05,
    //         screenWidth: [320,480,640,1024]
    //     },
    //     webdriverrtc: {},
    //     browserevent: {}
    // },
    //
    // Test runner services
    // Services take over a specific job you don't want to take care of. They enhance
    // your test setup with almost no effort. Unlike plugins, they don't add new
    // commands. Instead, they hook themselves up into the test process.
    // services: [],//
    // Framework you want to run your specs with.
    // The following are supported: Mocha, Jasmine, and Cucumber
    // see also: http://webdriver.io/guide/testrunner/frameworks.html
    //
    // Make sure you have the wdio adapter package for the specific framework installed
    // before running any tests.
    framework: 'mocha',

    // Options to be passed to Mocha.
    // See the full list at http://mochajs.org/
    mochaOpts: {
      ui: 'bdd',
      timeout: 30000,
    },

    // Test reporter for stdout.
    // The only one supported by default is 'dot'
    // see also: http://webdriver.io/guide/reporters/dot.html
    reporters: ['junit', 'spec'],
    reporterOptions: {
      junit: {
        outputDir: __dirname + '/junit/'
      }
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
    onPrepare: function (config, capabilities) {
      return Promise.all(this.onPrepares.map(fn => fn(config, capabilities)).filter(Boolean));
    },
    onPrepares: [
      function webpackTestPage() {
        return new Promise(function(resolve, reject) {
          const path = require('path');
          console.log('Webpack: setting up test/pages/webpack.');

          require('webpack')({
            entry: path.resolve(__dirname, 'pages/webpack/index.js'),
            output: {
              path: path.resolve(__dirname, 'pages/webpack'),
              filename: 'bundle.js',
            },
            optimization: {
              minimize: true,
              minimizer: [
                new TerserPlugin({
                  include: /\.js$/,
                  terserOptions: {
                    ie8: true,
                    safari10: true,
                  },
                }),
              ],
            },
          }, function(err, stats) {
            if (err) {
              console.error('Webpack: errored.');
              reject(err);
            } else {
              console.log('Webpack: set up.');
              resolve(stats);
            }
          });
        });
      }
    ],

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
     * Gets executed after all workers got shut down and the process is about to exit.
     * @param {Object} exitCode 0 - success, 1 - fail
     * @param {Object} config wdio configuration object
     * @param {Array.<Object>} capabilities list of capabilities details
     */
    onComplete: function(exitCode, config, capabilities) {
      return Promise.all(this.onCompletes.map(fn => fn(exitCode, config, capabilities)).filter(Boolean));
    },
    onCompletes: [],

    /**
     * Gets executed before test execution begins. At this point you can access to all global
     * variables like `browser`. It is the perfect place to define custom commands.
     * @param {Array.<Object>} capabilities list of capabilities details
     * @param {Array.<String>} specs List of spec file paths that are to be run
     */
    before: function (capabilities, specs) {
      // Set up Chai.
      var chai = require('chai');
      global.expect = chai.expect;
      chai.Should();

      /**
       * browser.waitForURL navigates to url and waits until the browser URL
       * contains it, timing out after timeout or 10000 milliseconds.
       */
      browser.addCommand('waitForURL', function(url, timeout) {
        let latest = '(none)';
        try {
          browser.url(url);
          return browser.waitUntil(
            function () {
              latest = browser.getUrl();
              return latest.indexOf(url) > -1;
            },
            timeout,
            'timeout'
          );
        } catch (e) {
          if (e.message == 'timeout') {
            throw new Error("Timed out waiting for URL starting " + url + ". Last URL was " + latest);
          }
          throw e;
        }
      });
      /**
       * browser.waitForQueryParam waits for the browser URL to define
       * param=value in the query string.
       */
      browser.addCommand('waitForQueryParam', function(param, value, timeout) {
        value = encodeURIComponent(value).replace('%20', '+');
        const targetParam = new RegExp('[&?]' + (param + '=' + value).replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1") + '(&|$)');

        var latest;
        try {
          return browser.waitUntil(
            function () {
              latest = browser.getUrl();
              return targetParam.test(latest);
            },
            timeout,
            'timeout'
          );
        } catch (e) {
          if (e.message == 'timeout') {
            throw new Error("Timed out waiting for URL with query param " + param + "=" + value + ". Last URL was " + latest);
          }
          throw e;
        }
      });
    },

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
    //   // Retrieve and clear the browser log buffer so that browser start-up logs
    //   // from extensions and such don't clutter logs later.
    //   browser.log('browser');
    // },
    /**
     * Function to be executed before a test (in Mocha/Jasmine) or a step (in Cucumber) starts.
     * @param {Object} test test details
     */
    // beforeTest: function (test) {
    // },
    /**
     * Hook that gets executed _before_ a hook within the suite starts (e.g. runs before calling
     * beforeEach in Mocha)
     */
    // beforeHook: function () {
    // },
    /**
     * Hook that gets executed _after_ a hook within the suite ends (e.g. runs after calling
     * afterEach in Mocha)
     */
    // afterHook: function () {
    // },
    /**
     * Function to be executed after a test (in Mocha/Jasmine) or a step (in Cucumber) ends.
     * @param {Object} test test details
     */
    // afterTest: function (test) {
    //   // Fetch the logs from the browser. Documented as returning Object[] but
    //   // it seems to return {state: 'success', sessionId, value: [logs...]};
    //   let logs = browser.log('browser');
    //   if (logs.value) {
    //     logs = logs.value;
    //   }

    //   if (test.passed) {
    //     // Abort if the test passed and we have no errors or warnings.
    //     let hasErr = false;
    //     for (log of logs) {
    //       if (log.level === 'WARNING' || log.level === 'SEVERE') {
    //         hasErr = true;
    //         break;
    //       }
    //     }
    //     if (!hasErr) {
    //       return;
    //     }
    //   }

    //   // Dump the logs.
    //   for (log of logs) {
    //     console.info(log.level, log.message);
    //   }
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
}
