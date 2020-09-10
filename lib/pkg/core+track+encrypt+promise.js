import Core from '../core';
import Track from '../track';
import encrypt from '../encrypt';
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

RavelinJS.prototype.encrypt = function(card) {
  return encrypt(card);
}

module.exports = RavelinJS;
