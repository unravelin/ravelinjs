import { Core } from '../core';
import { Encrypt } from '../encrypt';

 /**
  * @param {object} [cfg]
  */
function Ravelin(cfg) {
  cfg.Promise = cfg.Promise || Ravelin.Promise;
  this.core = new Core(cfg);
  this.encrypt = new Encrypt(this.core, cfg);
}

Ravelin.Promise = window.Promise;

export default Ravelin;
