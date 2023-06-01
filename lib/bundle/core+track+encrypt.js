import { Core } from '../core';
import { Track } from '../track';
import { Encrypt } from '../encrypt';

 /**
  * @param {object} [cfg]
  */
function Ravelin(cfg) {
  cfg.Promise = cfg.Promise || Ravelin.Promise;
  this.core = new Core(cfg);
  this.track = new Track(this.core, cfg);
  this.encrypt = new Encrypt(this.core, cfg);
}

Ravelin.Promise = typeof Promise !== 'undefined' && Promise;

export default Ravelin;
