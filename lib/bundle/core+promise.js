import Core from '../core';
import Promise from '../promise';


 /**
  * @param {object} [cfg]
  */
function RavelinJS(cfg) {
  this.core = new Core();
  if (cfg) this.init(cfg);
}

RavelinJS.prototype.init = function(cfg) {
  cfg.Promise = cfg.Promise || window.Promise || Promise;
  this.core.init(cfg);
}

export default new RavelinJS();
