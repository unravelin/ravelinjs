const path = require('path');

const base = require('./crossbrowser.conf');
const cap = base.config.capabilities[0];
cap.name = 'e2e ' + cap.name;

exports.config = Object.assign(base.config, {
    specs: [
        path.resolve(__dirname, 'specs/e2e-test.js'),
    ],
    capabilities: [cap],
});