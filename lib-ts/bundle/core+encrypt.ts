import { Core } from '../core';
import { Encrypt, EncryptConfig } from '../encrypt';

export default class Ravelin {
  public core: Core;
  public encrypt: Encrypt;

  constructor(cfg: EncryptConfig = {}) {
    this.core = new Core(cfg);
    this.encrypt = new Encrypt(this.core, cfg);
  }
}
