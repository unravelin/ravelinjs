import { Core } from '../core';
import { Encrypt } from '../encrypt';
import Promise from '../promise';

 /**
  * @param {object} [cfg]
  */
export default function Ravelin(cfg) {
  cfg.Promise = cfg.Promise || window.Promise || Promise;
  this.core = new Core(cfg);
  this.encrypt = new Encrypt(this.core, cfg);
}
