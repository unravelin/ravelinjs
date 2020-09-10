import Core from '../core';
import Track from '../track';
import Promise from 'core-js-pure/modules/es.promise.js';

/**
 * @class
 * @param {object} cfg
 */
function RavelinJS(cfg) {
  cfg.Promise = cfg.Promise || Promise;
  this.core = new Core(cfg);
  this.track = new Track(this.core, cfg);
}

module.exports = RavelinJS;
