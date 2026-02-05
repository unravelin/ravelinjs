import { Core } from '../core';
import { Encrypt, type EncryptConfig } from '../encrypt';

export default class Ravelin {
  public core: Core;
  public encrypt: Encrypt;

  public constructor(cfg: EncryptConfig = {}) {
    this.core = new Core(cfg);
    this.encrypt = new Encrypt(this.core, cfg);
  }
}
