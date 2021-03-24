import { Core } from '../core';
import { Track } from '../track';

 /**
  * @param {object} [cfg]
  */
function Ravelin(cfg) {
  cfg.Promise = Ravelin.Promise;
  this.core = new Core(cfg);
  this.track = new Track(this.core, cfg);
}

Ravelin.Promise = window.Promise;

export default Ravelin;
