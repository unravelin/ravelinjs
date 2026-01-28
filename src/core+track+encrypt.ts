import { Core } from './lib/core';
import { Encrypt, type EncryptConfig } from './lib/encrypt';
import { Track, type TrackConfig } from './lib/track';

export default class Ravelin {
  public core: Core;
  public track: Track;
  public encrypt: Encrypt;

  constructor(cfg: TrackConfig & EncryptConfig = {}) {
    this.core = new Core(cfg);
    this.track = new Track(this.core, cfg);
    this.encrypt = new Encrypt(this.core, cfg);
  }
}
