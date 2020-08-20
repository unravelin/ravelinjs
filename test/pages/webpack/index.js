// We use `var x = require('x')` instead of `import x from 'x'` to demonstrate
// that ravelinjs and webpack can be made to work with IE8, if you require it.

var ravelin = require('../../../src/ravelin.js');
var TestPageSetup = require('../common.js');

TestPageSetup(ravelin);
