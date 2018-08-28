const request = require('request');
const cbt = require('cbt_tunnels');

const user = process.env.CROSSBROWSERTESTING_USER;
const key = process.env.CROSSBROWSERTESTING_KEY;

if (!user || !key) {
    throw new Error('Set the CROSSBROWSERTESTING_USER and CROSSBROWSERTESTING_KEY envvars.');
}

const base = require('./base.conf').config;
exports.config = Object.assign(base, {
    // Appium desktop defaults.
    host: 'hub.crossbrowsertesting.com',
    port: 80,
    user: user,
    key: key,

    // Picked up by cbt_tunnels.
    baseUrl: 'http://local',

    maxInstances: parseInt(process.env.WD_PARALLEL, 10) || 1,
    capabilities: [
        // Chrome.
        {
            build: 'ravelinjs 1.0',
            name: 'win10 chromeLatest',
            browserName: 'Chrome',
            version: 'latest',
            platform: 'Windows 10',
        },
        // {
        //     build: 'ravelinjs 1.0',
        //     name: 'osx chromeLatest',
        //     browserName: 'Chrome',
        //     version: 'latest',
        //     platform: 'Mac OSX 10.12',
        // },
        {
            build: 'ravelinjs 1.0',
            name: 'win8 chrome18',
            browserName: 'Chrome',
            version: '18',
            platform: 'Windows 8',
        },
        // Safari.
        // {
        //     build: 'ravelinjs 1.0',
        //     name: 'osx safari11',
        //     browserName: 'Safari',
        //     version: '11',
        //     platform: 'Mac OSX 10.13',
        // },
        // {
        //     build: 'ravelinjs 1.0',
        //     name: 'osx safari10',
        //     browserName: 'Safari',
        //     version: '10',
        //     platform: 'Mac OSX 10.12',
        // },
        {
            build: 'ravelinjs 1.0',
            name: 'osx safari6',
            browserName: 'Safari',
            version: '6.2',
            platform: 'Mac OSX 10.8',
        },
        // Firefox.
        {
            build: 'ravelinjs 1.0',
            name: 'osx ffLatest',
            browserName: 'Firefox',
            version: 'latest',
            platform: 'Mac OSX 10.13',
            screenResolution: '1366x768'
        },
        {
            build: 'ravelinjs 1.0',
            name: 'win10 ffLatest',
            browserName: 'Firefox',
            version: 'latest',
            platform: 'Windows 10',
            screenResolution: '1366x768'
        },
        {
            build: 'ravelinjs 1.0',
            name: 'win10 ff45',
            browserName: 'Firefox',
            version: '45',
            platform: 'Windows 10',
            screenResolution: '1366x768'
        },
        // Edge.
        {
            build: 'ravelinjs 1.0',
            name: 'win10 edge14',
            browserName: 'MicrosoftEdge',
            version: '14',
            platform: 'Windows 10',
            screenResolution: '1366x768',
        },
        // Internet Explorer.
        {
            build: 'ravelinjs 1.0',
            name: 'win10 ie11',
            browserName: 'Internet Explorer',
            version: '11',
            platform: 'Windows 10',
            screenResolution: '1366x768',
        },
        {
            build: 'ravelinjs 1.0',
            name: 'win8 ie10',
            browserName: 'Internet Explorer',
            version: '10',
            platform: 'Windows 8',
            screenResolution: '1366x768',
        },
        {
            build: 'ravelinjs 1.0',
            name: 'win7 ie9',
            browserName: 'Internet Explorer',
            version: '9',
            platform: 'Windows 7 64-Bit',
            screenResolution: '1366x768',
        },
        {
            build: 'ravelinjs 1.0',
            name: 'win7 ie8',
            browserName: 'Internet Explorer',
            version: '8',
            platform: 'Windows 7',
            screenResolution: '1366x768',
            record_video: 'true',

            webpackTestDisabled: true,
        },

        // Android
        {
          build: 'ravelinjs 1.0',
          browserName: 'Chrome',
          deviceName: 'Nexus 9',
          platformVersion: '6.0',
          platformName: 'Android',
          deviceOrientation: 'portrait',
        },
        // iOS
        {
          build: 'ravelinjs 1.0',
          name: 'iOS11 safari8',
          browserName: 'Safari',
          deviceName: 'iPhone 8 Simulator',
          platformVersion: '11.0',
          platformName: 'iOS',
          deviceOrientation: 'portrait',
        },
    ].filter(
        // Filter the capabilities by name if there's a BROWSERS envvar.
        !process.env.BROWSERS ? () => true : (b) => !!~b.name.toLowerCase().indexOf(process.env.BROWSERS.toLowerCase())
    ),

    /**
     * Gets executed after all tests are done. You still have access to all global variables from
     * the test.
     * @param {Number} result 0 - test pass, 1 - test fail
     * @param {Array.<Object>} capabilities list of capabilities details
     * @param {Array.<String>} specs List of spec file paths that ran
     */
    after: function (result, capabilities, specs) {
        var sessionId = browser.requestHandler.sessionID;
        var score = result ? 'fail' : 'pass';
        request(
            {
                method: 'PUT',
                uri: 'https://crossbrowsertesting.com/api/v3/selenium/' + encodeURIComponent(sessionId),
                body: { 'action': 'set_score', 'score': score },
                json: true,
            },
            function(error, response, body) {
                if (error) {
                    browser.logger.error('Failed to update session ' + sessionId + ' score to ' + score + ': ' + error);
                } else if (response.statusCode !== 200) {
                    browser.logger.error('Failed to update session ' + sessionId + ' score to ' + score + ': got status code ' + response.statusCode);
                } else {
                    browser.logger.info('Updated session ' + sessionId + ' score to ' + score + '.');
                }
            }
        ).auth(user, key);
    },
});

exports.config.onPrepares.push(function(config, capabilities) {
    return new Promise(function(resolve, reject) {
        console.log('Crossbrowsertesting: Opening tunnel.');
        cbt.start({username: user, authkey: key, dir: __dirname}, function(err) {
            if (err) {
                return reject('Failed to open CBT tunnel: ' + err);
            }
            console.log('Crossbrowsertesting: Tunnel open.');
            resolve();
        });
    });
});

exports.config.onCompletes.push(function () {
    cbt.stop();
});
