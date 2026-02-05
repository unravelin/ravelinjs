import { Core } from '../core';
import { Track, type TrackConfig } from '../track';

export default class Ravelin {
  public core: Core;
  public track: Track;

  public constructor(cfg: TrackConfig = {}) {
    this.core = new Core(cfg);
    this.track = new Track(this.core, cfg);
  }
}
