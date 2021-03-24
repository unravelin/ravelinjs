import { Core } from '../core';

 /**
  * @param {object} [cfg]
  */
function Ravelin(cfg) {
  cfg.Promise = cfg.Promise || Ravelin.Promise;
  this.core = new Core(cfg);
}

Ravelin.Promise = window.Promise;

export default Ravelin;
