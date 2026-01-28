import type { Core, CoreConfig } from './core';
import { RSAKey, sjcl } from './encryption-vendored';

/**
 * Interface representing the Card object to be encrypted.
 */
export interface Card {
  /** The RSA key to be used for encryption of the card. */
  rsaKey?: string;
  /** The full card number. */
  pan: string;
  /** The expiration month of the card. */
  month: number | string;
  /** The expiration year of the card. */
  year: number | string;
  /** The account holder name. */
  nameOnCard?: string;
}

/**
 * Interface representing the encrypted payment method result.
 */
export interface PaymentMethodCipher {
  methodType: string;
  cardCiphertext: string;
  aesKeyCiphertext: string;
  algorithm: string;
  ravelinSDKVersion: string;
  keyIndex: number;
  keySignature: string;
}

/**
 * Configuration interface for the Encrypt module.
 */
export interface EncryptConfig extends CoreConfig {
  rsaKey?: string;
}

/**
 * Internal interface for the parsed RSA key.
 */
interface Key {
  key: encryption.RSAKey;
  index: number;
  sig: string;
}

/**
 * Internal interface for AES encryption result.
 */
interface AesResult {
  ciphertextB64: string;
  aesKeyB64: string;
  ivB64: string;
}

/**
 * The Encrypt class provides card-encryption methods.
 */
export class Encrypt {
  private key?: Key;

  /**
   * @param core The Core library instance.
   * @param cfg The encryption configuration.
   */
  public constructor(
    private core: Core,
    cfg: EncryptConfig
  ) {
    // Bind 'card' to ensure 'this' context is preserved if passed as a callback,
    // though strict class usage usually avoids this need.
    this.card = this.core.bind(this.card, this);

    if (cfg.rsaKey) {
      this.key = parseKey(cfg.rsaKey);
    }

    if (sjcl.random && sjcl.random.startCollectors) {
      sjcl.random.startCollectors();
    }
  }

  /**
   * Encrypt a card into an encrypted payment method that
   * can be sent via your server to Ravelin.
   *
   * @param card The card details to encrypt.
   * @return The encrypted payment method cipher.
   */
  public card(card: Card): PaymentMethodCipher {
    // Check that we've got an argument
    if (!card) {
      throw new Error('ravelin/encrypt: card is required');
    }

    // Check there are no unexpected properties on card.
    for (const prop in card) {
      if (!Object.prototype.hasOwnProperty.call(card, prop)) {
        continue;
      }
      switch (prop) {
        case 'rsaKey':
        case 'pan':
        case 'year':
        case 'month':
        case 'nameOnCard':
          continue;
        default:
          throw new Error('ravelin/encrypt: unrecognised property ' + prop);
      }
    }

    // Parse the key
    let key = this.key;
    if (card.rsaKey) {
      if (typeof card.rsaKey !== 'string') {
        throw new Error('ravelin/encrypt: card.rsaKey should be a string');
      }
      key = parseKey(card.rsaKey);
    }
    if (!key) {
      throw new Error('ravelin/encrypt: no rsaKey provided');
    }

    // Validate the PAN
    let pan = card.pan;
    if (pan) {
      pan = pan.toString().replace(/[^0-9]/g, '');
    }
    if (!pan || pan.length < 12) {
      throw new Error('ravelin/encrypt: card.pan should have at least 12 digits');
    }

    // Validate month is an integer or string of an integer in the range 1-12.
    let month = card.month;
    if (typeof month === 'string') {
      month = parseInt(month, 10);
    }
    if (!(month > 0 && month < 13)) {
      throw new Error('ravelin/encrypt: card.month should be in the range 1-12');
    }

    // Validate year is an integer or string of an integer in the range 1-99 or
    // 2000+. If in the range 1-99 we convert it to 2001-2099.
    let year = card.year;
    if (typeof year === 'string') {
      year = parseInt(year, 10);
    }
    if (year > 0 && year < 100) {
      year += 2000;
    }
    if (!year || year <= 2000) {
      throw new Error('ravelin/encrypt: card.year should be in the 21st century');
    }

    // AES encrypt the card details, using a uniquely generated session key and
    // IV. The GCM auth tag is appended to the ciphertext. This key and IV are
    // returned from this call as well as the card detail ciphertext,
    // all as base64.
    let aesResult: AesResult;
    try {
      aesResult = aesEncrypt(
        JSON.stringify({
          pan: pan,
          year: year.toString(),
          month: month.toString(),
          nameOnCard: card.nameOnCard,
        })
      );
    } catch (e: any) {
      if (e && e.toString().indexOf('generator') !== -1) {
        throw new Error('ravelin/encrypt: generator not ready');
      }
      throw e;
    }

    // RSA encrypt the key and IV from the previous step,
    // as a single, pipe-delimited string.
    const rsaResultB64 = rsaEncrypt(key.key, aesResult.aesKeyB64, aesResult.ivB64);

    // This payload identically matches the structure we expect
    // to be sent to the Ravelin API.
    return {
      methodType: 'paymentMethodCipher',
      cardCiphertext: aesResult.ciphertextB64,
      aesKeyCiphertext: rsaResultB64,
      algorithm: 'RSA_WITH_AES_256_GCM',
      ravelinSDKVersion: this.core.version,
      keyIndex: key.index,
      keySignature: key.sig,
    };
  }
}

/**
 * parseKey extracts the components of a key string ready for use.
 *
 * A client's public RSA key has a structure of either 'exponent|modulus' or
 * 'keyIndex|exponent|modulus'. The index of a key is roughly equivalent to the
 * version, with each new RSA key pair we generate for a client having an index
 * of n+1. A single client can have multiple active RSA key pairs, and we can
 * decomission a key pair as required while allowing all other active versions
 * to operate.
 *
 * The first key we issue a client is of index 0. For keys of index 0, we omit
 * this value from the key. e.g '10001|AA1C1C1EC...`
 *
 * For all keys beyond the first, the index is prefixed to key definition. e.g
 * '1|10001|BB2D2D2FD...'
 *
 * For all keys (including those of index 0), the index must be returned from
 * 'encrypt' calls; the value is needed server-side to determine which private
 * key should be used for decryption.
 */
function parseKey(rsaKeyString: string): Key {
  const split = rsaKeyString.split('|');
  if (split.length < 2 || split.length > 3) {
    throw new Error('ravelin/encrypt: invalid rsaKey');
  }

  let index: number;
  let modulus: string;
  let exponent: string;

  if (split.length === 2) {
    index = 0;
    modulus = split[1];
    exponent = split[0];
  } else {
    index = +split[0];
    modulus = split[2];
    exponent = split[1];
  }

  const key = new RSAKey();
  // Params specified in reverse order to how we defined the key
  key.setPublic(modulus, exponent);

  return {
    key: key,
    index: index,
    sig: sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(rsaKeyString)),
  };
}

/**
 * Encrypts plaintext using AES-GCM.
 */
function aesEncrypt(plaintext: string): AesResult {
  const aesKeyLength = 256;
  const wordCount = aesKeyLength / 32;
  const paranoiaCount = 4; // 128 bits of entropy

  const sessionKey = sjcl.random.randomWords(wordCount, paranoiaCount);
  const iv = sjcl.random.randomWords(wordCount, paranoiaCount);

  const aesBlockCipher = new sjcl.cipher.aes(sessionKey);
  const bits = sjcl.codec.utf8String.toBits(plaintext);
  const ciphertext = sjcl.mode.gcm.encrypt(aesBlockCipher, bits, iv, null, 128);

  return {
    ciphertextB64: sjcl.codec.base64.fromBits(ciphertext),
    aesKeyB64: sjcl.codec.base64.fromBits(sessionKey),
    ivB64: sjcl.codec.base64.fromBits(iv),
  };
}

/**
 * Encrypts the AES key and IV using the RSA public key.
 */
function rsaEncrypt(pubKey: encryption.RSAKey, aesKeyB64: string, ivB64: string): string {
  const encryptedHex = pubKey.encrypt(aesKeyB64 + '|' + ivB64);
  if (!encryptedHex) {
    return '';
  }
  const encryptedBits = sjcl.codec.hex.toBits(encryptedHex);
  return sjcl.codec.base64.fromBits(encryptedBits);
}
