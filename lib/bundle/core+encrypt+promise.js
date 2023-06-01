import { Core } from '../core';
import { Encrypt } from '../encrypt';
import PolyfillPromise from '../promise';

 /**
  * @param {object} [cfg]
  */
function Ravelin(cfg) {
  cfg.Promise = cfg.Promise || Ravelin.Promise;
  this.core = new Core(cfg);
  this.encrypt = new Encrypt(this.core, cfg);
}

Ravelin.Promise = typeof Promise !== 'undefined' && Promise || PolyfillPromise;

export default Ravelin;
