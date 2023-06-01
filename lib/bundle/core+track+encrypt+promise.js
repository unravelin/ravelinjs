import { Core } from '../core';
import { Track } from '../track';
import { Encrypt } from '../encrypt';
import PolyfillPromise from '../promise';

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
  cfg.Promise = cfg.Promise || Ravelin.Promise;
  /** @prop {Core} core */
  this.core = new Core(cfg);
  /** @prop {Track} track */
  this.track = new Track(this.core, cfg);
  /** @prop {Encrypt} encrypt */
  this.encrypt = new Encrypt(this.core, cfg);
}

Ravelin.Promise = typeof Promise !== 'undefined' && Promise || PolyfillPromise;

export default Ravelin;
