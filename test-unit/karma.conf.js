const fs = require('fs');

if (!fs.existsSync('./certs/localhost.pem') || !fs.existsSync('./certs/localhost-key.pem')) {
  console.error(
    'Certificates not found. Please generate localhost.pem and localhost-key.pem in the certs directory.'
  );
  process.exit(1);
}

module.exports = function (config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '.',

    // frameworks to use
    // available frameworks: https://www.npmjs.com/search?q=keywords:karma-adapter
    frameworks: ['mocha', 'chai'],

    // list of files / patterns to load in the browser
    files: [
      '../node_modules/jquery/dist/jquery.js',
      '../node_modules/xhook/dist/xhook.js',
      'ravelin.js',
      'utils.js',
      '**/*.spec.js',
    ],

    // list of files / patterns to exclude
    exclude: [],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://www.npmjs.com/search?q=keywords:karma-preprocessor
    preprocessors: {},

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://www.npmjs.com/search?q=keywords:karma-reporter
    reporters: ['progress'],

    // use HTTPS server
    protocol: 'https:',
    httpsServerOptions: {
      key: fs.readFileSync('./certs/localhost-key.pem', 'utf8'),
      cert: fs.readFileSync('./certs/localhost.pem', 'utf8'),
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://www.npmjs.com/search?q=keywords:karma-launcher
    browsers: ['ChromeHeadless'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser instances should be started simultaneously
    concurrency: Infinity,
  });
};
