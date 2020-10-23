import { Core } from '../core';
import Promise from '../promise';

 /**
  * @param {object} [cfg]
  */
export default function Ravelin(cfg) {
  cfg.Promise = cfg.Promise || window.Promise || Promise;
  this.core = new Core(cfg);
}
