import { Core } from '../core';
import { Track } from '../track';

 /**
  * @param {object} [cfg]
  */
function RavelinJS(cfg) {
  this.core = new Core();
  this.track = new Track(this.core);

  if (cfg) this.init(cfg);
}

RavelinJS.prototype.init = function(cfg) {
  this.core.init(cfg);
  this.track.init(cfg);
}

export default new RavelinJS();
