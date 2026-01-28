import { Core } from './lib/core';
import { Encrypt, type EncryptConfig } from './lib/encrypt';

export default class Ravelin {
  public core: Core;
  public encrypt: Encrypt;

  constructor(cfg: EncryptConfig = {}) {
    this.core = new Core(cfg);
    this.encrypt = new Encrypt(this.core, cfg);
  }
}
