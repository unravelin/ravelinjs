import { Core } from '../core';
import PolyfillPromise from '../promise';

 /**
  * @param {object} [cfg]
  */
function Ravelin(cfg) {
  cfg.Promise = cfg.Promise || Ravelin.Promise;
  this.core = new Core(cfg);
}

Ravelin.Promise = typeof Promise !== 'undefined' && Promise || PolyfillPromise;

export default Ravelin;
