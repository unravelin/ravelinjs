/**
 * The encrypt module provides card-encryption methods.
 */

import {sjcl, RSAKey} from './encryption-vendored';

/**
 * @typedef {object} Card
 * @prop {string} rsaKey The RSA key to be used for encryption of the card.
 * @prop {string} pan The full card number.
 * @prop {number|string} month The expiration month of the card.
 * @prop {number|string} year The expiration year of the card.
 * @prop {string} [nameOnCard] The account holder name.
 */

/**
 * @typedef {object} PaymentMethodCipher
 * @prop {string} methodType
 * @prop {string} cardCiphertext
 * @prop {string} aesKeyCiphertext
 * @prop {string} algorithm
 * @prop {string} ravelinSDKVersion
 * @prop {number} keyIndex
 * @prop {string} keySignature
 */

 /**
  * @typedef {object} EncryptConfig
  * @prop {string} [rsaKey]
  */

 /**
  * @constructor
  * @param {Core} core
  * @param {EncryptConfig} cfg
  */
export function Encrypt(core, cfg) {
  this.core = core;
  this.card = core.bind(this.card, this);
  if (cfg.rsaKey) this.key = parseKey(cfg.rsaKey);
  sjcl.random.startCollectors();
}

/**
 * Encrypt a card into an encrypted payment method that can be sent via your
 * server to Ravelin.
 *
 * @param {Card} card
 * @return {PaymentMethodCipher}
 */
Encrypt.prototype.card = function(card) {
  // Check that we've got an argument.
  if (!card) {
    throw new Error('ravelin/encrypt: card is required');
  }

  // Check there are no unexpected properties on card.
  for (var prop in card) {
    if (!card.hasOwnProperty(prop)) continue;
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

  // Parse the key.
  var key = this.key;
  if (card.rsaKey) {
    if (typeof card.rsaKey !== 'string') {
      throw new Error('ravelin/encrypt: card.rsaKey should be a string');
    }
    key = parseKey(card.rsaKey);
  }
  if (!key) {
    throw new Error('ravelin/encrypt: no rsaKey provided');
  }

  // Validate the PAN.
  if (card.pan) {
    card.pan = card.pan.toString().replace(/[^0-9]/g, '');
  }
  if (!card.pan || card.pan.length < 12) {
    throw new Error('ravelin/encrypt: card.pan should have at least 12 digits');
  }

  // Validate month is an integer or string of an integer in the range 1-12.
  if (typeof card.month == 'string') {
    card.month = parseInt(card.month, 10);
  }
  if (!(card.month > 0 && card.month < 13)) {
    throw new Error('ravelin/encrypt: card.month should be in the range 1-12');
  }

  // Validate year is an integer or string of an integer in the range 1-99 or
  // 2000+. If in the range 1-99 we convert it to 2001-2099.
  if (typeof card.year === 'string') {
    card.year = parseInt(card.year, 10);
  }
  if (card.year > 0 && card.year < 100) {
    card.year += 2000;
  }
  if (!card.year || card.year <= 2000) {
    throw new Error('ravelin/encrypt: card.year should be in the 21st century');
  }

  // AES encrypt the card details, using a uniquely generated session key and
  // IV. The GCM auth tag is appended to the ciphertext. This key and IV are
  // returned from this call as well as the card detail ciphertext, all as
  // base64.
  var aesResult;
  try {
    aesResult = aesEncrypt(JSON.stringify({
      pan: card.pan,
      year: card.year.toString(),
      month: card.month.toString(),
      nameOnCard: card.nameOnCard
    }));
  } catch (e) {
    if (e.toString().indexOf("generator") !== -1) {
      throw new Error('ravelin/encrypt: generator not ready');
    }
  }

  // RSA encrypt the key and IV from the previous step, as a single,
  // pipe-delimited string.
  var rsaResultB64 = rsaEncrypt(key.key, aesResult.aesKeyB64, aesResult.ivB64);

  // This payload identically matches the structure we expect to be sent to the
  // Ravelin API.
  return {
    methodType: 'paymentMethodCipher',
    cardCiphertext: aesResult.ciphertextB64,
    aesKeyCiphertext: rsaResultB64,
    algorithm: 'RSA_WITH_AES_256_GCM',
    ravelinSDKVersion: this.core.version,
    keyIndex: key.index,
    keySignature: key.sig
  };
};

/**
 * @typedef {object} Key
 * @prop {object} key TODO: Change type to RSAKey?
 * @prop {number} index
 * @prop {string} sig
 */
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
 *
 * @param {string} rsaKey
 * @returns {Key}
 */
function parseKey(rsaKey) {
  // Split.
  var split = rsaKey.split('|');
  if (split.length < 2 || split.length > 3) {
    throw new Error('ravelin/encrypt: invalid rsaKey');
  }
  var index, modulus, exponent;
  if (split.length === 2) {
    index = 0;
    modulus = split[1];
    exponent = split[0];
  } else {
    index = +split[0];
    modulus = split[2];
    exponent = split[1];
  }

  // Use.
  var key = new RSAKey();
  key.setPublic(modulus, exponent); // params specified in reverse order to how we defined the key
  return {
    key: key,
    index: index,
    sig: sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(rsaKey))
  };
}

function aesEncrypt(plaintext) {
  var aesKeyLength = 256;
  var wordCount = aesKeyLength/32;
  var paranoiaCount = 4; // 128 bits of entropy

  var sessionKey = sjcl.random.randomWords(wordCount, paranoiaCount);
  var iv = sjcl.random.randomWords(wordCount, paranoiaCount);

  var aesBlockCipher = new sjcl.cipher.aes(sessionKey);
  var bits = sjcl.codec.utf8String.toBits(plaintext);
  var ciphertext = sjcl.mode.gcm.encrypt(aesBlockCipher, bits, iv, null, 128);

  return {
    ciphertextB64: sjcl.codec.base64.fromBits(ciphertext),
    aesKeyB64: sjcl.codec.base64.fromBits(sessionKey),
    ivB64: sjcl.codec.base64.fromBits(iv)
  };
}

function rsaEncrypt(pubKey, aesKeyB64, ivB64) {
  var encryptedHex = pubKey.encrypt(aesKeyB64 + '|' + ivB64);
  var encryptedBits = sjcl.codec.hex.toBits(encryptedHex);
  var aesKeyAndIVCiphertextBase64 = sjcl.codec.base64.fromBits(encryptedBits);

  return aesKeyAndIVCiphertextBase64;
}
