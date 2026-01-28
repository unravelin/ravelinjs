import { Core, type CoreConfig } from './lib/core';

export default class Ravelin {
  public core: Core;

  constructor(cfg: CoreConfig = {}) {
    this.core = new Core(cfg);
  }
}
