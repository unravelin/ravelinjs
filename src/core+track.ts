import { Core } from './lib/core';
import { Track, type TrackConfig } from './lib/track';

export default class Ravelin {
  public core: Core;
  public track: Track;

  constructor(cfg: TrackConfig = {}) {
    this.core = new Core(cfg);
    this.track = new Track(this.core, cfg);
  }
}
