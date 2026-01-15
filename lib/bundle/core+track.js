import { Core } from '../core';
import { Track } from '../track';

 /**
  * @param {object} [cfg]
  */
function Ravelin(cfg) {
  this.core = new Core(cfg);
  this.track = new Track(this.core, cfg);
}

export default Ravelin;
