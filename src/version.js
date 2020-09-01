const pkgVersion = require('../package.json').version;

module.exports = bakedObj({
  version: pkgVersion + '-ravelinjs',
});

/**
 * bakedObj returns a function that returns an object with a code property
 * exporting the JSON-encoded version of vars, and has properties equal to vars.
 *
 * In Node the properties of vars can be accessed on the returned value, but
 * when this module is bundled with webpack its code will be that of the
 * function return. For version.js this means we don't bundle package.json.
 */
function bakedObj(vars) {
  // Serialise vars on package load so that we can detect in all environmets
  // when it includes a non-serialisable value.
  const code = 'module.exports = ' + JSON.stringify(vars) + ';';

  // Construct the val-loader code function and copy vars' properties.
  function versionMod() { return {code: code}; };
  for (var k in vars) {
    if (vars.hasOwnProperty(k)) versionMod[k] = vars[k];
  }
  return versionMod;
}
