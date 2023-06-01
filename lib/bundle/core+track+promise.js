import { Core } from '../core';
import { Track } from '../track';
import PolyfillPromise from '../promise';

 /**
  * @param {object} [cfg]
  */
function Ravelin(cfg) {
  cfg.Promise = cfg.Promise || Ravelin.Promise;
  this.core = new Core(cfg);
  this.track = new Track(this.core, cfg);
}

Ravelin.Promise = typeof Promise !== 'undefined' && Promise || PolyfillPromise;

export default Ravelin;
