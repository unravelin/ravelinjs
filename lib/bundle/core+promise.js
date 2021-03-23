import { Core } from '../core';
import Promise from '../promise';

 /**
  * @param {object} [cfg]
  */
function Ravelin(cfg) {
  cfg.Promise = cfg.Promise || Ravelin.Promise || window.Promise || Promise;
  this.core = new Core(cfg);
}

Ravelin.Promise = window.Promise || Promise;

export default Ravelin;
