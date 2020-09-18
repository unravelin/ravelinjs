import { Core } from '../core';
import { Track } from '../track';
import Promise from '../promise';

 /**
  * @param {object} [cfg]
  */
function RavelinJS(cfg) {
  this.core = new Core();
  this.track = new Track(this.core);

  if (cfg) this.init(cfg);
}

RavelinJS.prototype.init = function(cfg) {
  cfg.Promise = cfg.Promise || window.Promise || Promise;
  this.core.init(cfg);
  this.track.init(cfg);
}

export default new RavelinJS();
