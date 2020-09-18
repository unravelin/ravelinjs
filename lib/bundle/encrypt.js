import { Encrypt } from '../encrypt';

 /**
  * @param {import('../encrypt').EncryptedCard} [cfg]
  */
export default function Ravelin(cfg) {
  this.encrypt = new Encrypt(null, cfg);
}
