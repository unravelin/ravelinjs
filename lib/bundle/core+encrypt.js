import { Core } from '../core';
import { Encrypt } from '../encrypt';

 /**
  * @param {object} [cfg]
  */
function RavelinJS(cfg) {
  this.core = new Core();
  this.encrypt = new Encrypt(this.core);

  if (cfg) this.init(cfg);
}

RavelinJS.prototype.init = function(cfg) {
  this.core.init(cfg);
  this.encrypt.init(cfg);
}

export default new RavelinJS();
