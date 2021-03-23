import { Core } from '../core';
import { Track } from '../track';
import Promise from '../promise';

 /**
  * @param {object} [cfg]
  */
function Ravelin(cfg) {
  cfg.Promise = cfg.Promise || Ravelin.Promise || window.Promise || Promise;
  this.core = new Core(cfg);
  this.track = new Track(this.core, cfg);
}

Ravelin.Promise = window.Promise || Promise;

export default Ravelin;
