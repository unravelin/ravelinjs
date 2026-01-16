import { Core } from '../core';
import { Encrypt } from '../encrypt';
import { Track } from '../track';

/**
 * @typedef {object} Config
 * @mixes CoreConfig
 * @mixes EncryptConfig
 * @mixes TrackConfig
 */

 /**
  * @public
  * @class
  * @alias Ravelin
  * @param {Config} [cfg]
  */
function Ravelin(cfg) {
  /** @prop {Core} core */
  this.core = new Core(cfg);
  /** @prop {Track} track */
  this.track = new Track(this.core, cfg);
  /** @prop {Encrypt} encrypt */
  this.encrypt = new Encrypt(this.core, cfg);
}

export default Ravelin;
