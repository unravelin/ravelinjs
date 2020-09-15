import Core from '../core';


 /**
  * @param {object} [cfg]
  */
function RavelinJS(cfg) {
  this.core = new Core();
  if (cfg) this.init(cfg);
}

RavelinJS.prototype.init = function(cfg) {
  this.core.init(cfg);
}

export default new RavelinJS();
