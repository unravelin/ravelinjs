import { Core } from '../core';
import { Track } from '../track';
import { Encrypt } from '../encrypt';
import Promise from '../promise';

 /**
  * @public
  * @class
  * @alias Ravelin
  * @prop {Core} core
  * @prop {Track} track
  * @prop {Encrypt} encrypt
  */

 /**
  * @public
  * @alias Ravelin
  * @constructor
  * @param {object} [cfg]
  */
export default function Ravelin(cfg) {
  cfg.Promise = cfg.Promise || window.Promise || Promise;
  this.core = new Core(cfg);
  this.track = new Track(this.core, cfg);
  this.encrypt = new Encrypt(this.core, cfg);
}
