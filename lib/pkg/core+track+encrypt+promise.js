import Core from '../core';
import Track from '../track';
import encrypt from '../encrypt';
import Promise from 'core-js-pure/es/promise';

 /**
  * @param {object} [cfg]
  */
function RavelinJS(cfg) {
  if (!cfg) return;
  cfg.Promise = cfg.Promise || window.Promise || Promise;
  this.core = new Core(cfg);
  this.track = new Track(this.core, cfg);
}

/**
 * @param {object} cfg
 */
RavelinJS.prototype.init = function(cfg) {
  RavelinJS.call(this, cfg);
}

RavelinJS.prototype.encrypt = function(card) {
  return encrypt(card);
}

export default new RavelinJS();
