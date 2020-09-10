import Core from '../core';

/**
 * @class
 * @param {object} cfg
 */
function RavelinJS(cfg) {
  cfg.Promise = cfg.Promise || Promise;
  this.core = new Core(cfg);
}

module.exports = RavelinJS;
