import { Core } from '../core';
import { Encrypt } from '../encrypt';
import { Track } from '../track';

 /**
  * @param {object} [cfg]
  */
function Ravelin(cfg) {
  this.core = new Core(cfg);
  this.track = new Track(this.core, cfg);
  this.encrypt = new Encrypt(this.core, cfg);
}

export default Ravelin;
