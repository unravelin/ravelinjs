import { Core } from '../core';
import { Encrypt } from '../encrypt';

 /**
  * @param {object} [cfg]
  */
export default function Ravelin(cfg) {
  this.core = new Core(cfg);
  this.encrypt = new Encrypt(this.core, cfg);
}
