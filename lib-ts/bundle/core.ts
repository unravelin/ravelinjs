import { Core, CoreConfig } from '../core';

export default class Ravelin {
  public core: Core;

  constructor(cfg: CoreConfig = {}) {
    this.core = new Core(cfg);
  }
}
