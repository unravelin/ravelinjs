const user = process.env.BROWSERSTACK_USERNAME;
const key = process.env.BROWSERSTACK_ACCESS_KEY;

if (!user || !key) {
  throw new Error('Envvars BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set.')
}

const timeoutSeconds = 120;

const base = require('./base.conf').config;
exports.config = Object.assign(base, {
  services: ['browserstack'],
  browserstackLocal: true,
  browserstackOpts: {f: './test/'},
  baseUrl: 'http://' + user + '.browserstack.com/',
  user: user,
  key: key,
  screenshotPath: undefined,

  outputDir: 'logs',

  // Bail after the first test failure. The cost of running many tests is too
  // high, and it takes too damn long.
  bail: 0,
  mochaOpts: Object.assign(base.mochaOpts, {
    // Match mocha timeout with browser.
    timeout: timeoutSeconds * 1000,
  }),

  maxInstances: parseInt(process.env.WD_PARALLEL, 10) || 1,
  capabilities: [
    // Internet Explorer.
    {
      'name': 'Win10 IE11',
      'os' : 'Windows',
      'os_version' : '10',
      'browserName' : 'IE',
      'browser_version' : '11.0'
    },
    {
      'name': 'Win8 IE10',
      'os' : 'Windows',
      'os_version' : '8',
      'browserName' : 'IE',
      'browser_version' : '10.0'
    },
    {
      'name': 'Win7 IE9',
      'os' : 'Windows',
      'os_version' : '7',
      'browserName' : 'IE',
      'browser_version' : '9.0'
    },
    {
      'name': 'Win7 IE8',
      'os' : 'Windows',
      'os_version' : '7',
      'browserName' : 'IE',
      'browser_version' : '8'
    },

    // Android
    {
      name: 'Android5',
      "os_version" : "5.0",
      "device" : "Google Nexus 6",
      "real_mobile" : "true",
      "browserName" : "Android"
    },

    // iOS
    {
      "name": "iPhone8 iOS11",
      "os_version" : "11",
      "device" : "iPhone 8",
      "real_mobile" : "true",
      "browserName" : "iPhone",
      "browserstack.networkLogs": true,

      max_duration: 180,
      navigateTimeoutMS: 60000,
      renderTimeoutMS: 60000,
    },
    // {
    //   "name": 'iPhone8 iOS12',
    //   "os_version" : "12",
    //   "device" : "iPhone 8",
    //   "real_mobile" : "true",
    //   "browserName" : "iPhone",
    //   "browserstack.networkLogs": true,
    // },

    // Chrome.
    {
      build: 'ravelinjs 1.0',
      name: 'Win10 chromeLatest',
      "os" : "Windows",
      "os_version" : "10",
      "browserName" : "Chrome",
      "browser_version" : "latest",
    },
    // {
    //   build: 'ravelinjs 1.0',
    //   name: 'osx chromeLatest',
    //   browserName: 'Chrome',
    //   version: 'latest',
    //   platform: 'Mac OSX 10.12',
    // },
    // {
    //   build: 'ravelinjs 1.0',
    //   name: 'win8 chrome50',
    //   browserName: 'Chrome',
    //   version: '50',
    //   platform: 'Windows 8',
    // },
    // Safari.
    // {
    //   build: 'ravelinjs 1.0',
    //   name: 'osx safari11',
    //   browserName: 'Safari',
    //   version: '11',
    //   platform: 'Mac OSX 10.13',
    // },
    {
      name: "OSXCatalina Safari13",
      "os" : "OS X",
      "os_version" : "Catalina",
      "browserName" : "Safari",
      "browser_version" : "13.0",
    },
    // {
    //   build: 'ravelinjs 1.0',
    //   name: 'osx safari10',
    //   browserName: 'Safari',
    //   version: '10',
    //   platform: 'Mac OSX 10.12',
    // },
    // Firefox.
    {
      build: 'ravelinjs 1.0',
      name: 'osx ffLatest',
      "os" : "OS X",
      "os_version" : "Mojave",
      "browserName" : "Firefox",
      "browser_version" : "latest",
    },
    // {
    //   build: 'ravelinjs 1.0',
    //   name: 'win10 ffLatest',
    //   browserName: 'Firefox',
    //   version: 'latest',
    //   platform: 'Windows 10',
    //   screenResolution: '1366x768'
    // },
    // {
    //   build: 'ravelinjs 1.0',
    //   name: 'win10 ff45',
    //   browserName: 'Firefox',
    //   version: '45',
    //   platform: 'Windows 10',
    //   screenResolution: '1366x768'
    // },
    // Edge.
    // {
    //   build: 'ravelinjs 1.0',
    //   name: 'win10 edge17',
    //   browserName: 'MicrosoftEdge',
    //   version: '17',
    //   platform: 'Windows 10',
    //   screenResolution: '1366x768',
    // },
  ].map(function(c) {
    // Apply a maximum duration of 1 minute to each test case.
    c.max_duration = c.max_duration || timeoutSeconds;
    return c;
  }).filter(
    // Filter the capabilities by name if there's a BROWSERS envvar.
    !process.env.BROWSERS ? () => true : (b) => !!~b.name.toLowerCase().indexOf(process.env.BROWSERS.toLowerCase())
  ),
});
