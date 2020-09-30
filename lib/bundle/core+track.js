import { Core } from '../core';
import { Track } from '../track';

 /**
  * @param {object} [cfg]
  */
export default function Ravelin(cfg) {
  this.core = new Core(cfg);
  this.track = new Track(this.core, cfg);
}
