import Encrypt from '../encrypt';

 /**
  * @param {object} [cfg]
  */
function RavelinJS(cfg) {
  this.encrypt = new Encrypt(this.core);
}

RavelinJS.prototype.init = function(cfg) {
  this.encrypt.init(cfg);
}

export default new RavelinJS();
