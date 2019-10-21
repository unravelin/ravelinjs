var RavelinJS = require('./core');
var { RSAKey, sjcl } = require('./encryption-vendored');
var FULL_VERSION_STRING = require('./version');

/**
 * setRSAKey configures RavelinJS with the given public encryption key, in the format that
 * Ravelin provides it. You can find your public RSA key inside the Ravelin dashboard.
 *
 * @param {String} rawPubKey The public RSA key provided by Ravelin, used to encrypt card details.
 * @example
 * ravelinjs.setRSAKey('10010|abc123...xyz789');
 */
RavelinJS.prototype.setRSAKey = function(rawPubKey) {
  if (typeof rawPubKey !== 'string') {
    throw new Error('[ravelinjs] Invalid value provided to RavelinJS.setRSAKey');
  }

  // A client's public RSA key has a structure of either 'exponent|modulus' or 'keyIndex|exponent|modulus'.
  // The index of a key is roughly equivalent to the version, with each new RSA key pair we
  // generate for a client having an index of n+1. A single client can have multiple active RSA key pairs,
  // and we can decomission a key pair as required while allowing all other active versions to operate.
  //
  // The first key we issue a client is of index 0. For keys of index 0, we omit this value from the key.
  // e.g '10001|AA1C1C1EC...`
  //
  // For all keys beyond the first, the index is prefixed to key definition.
  // e.g '1|10001|BB2D2D2FD...'
  //
  // For all keys (including those of index 0), the index must be returned from 'encrypt' calls;
  // the value is needed server-side to determine which private key should be used for decryption.
  var split = rawPubKey.split('|');
  if (split.length < 2 || split.length > 3) {
    throw new Error('[ravelinjs] Invalid value provided to RavelinJS.setRSAKey');
  }

  var rsaKey = new RSAKey();
  var keyIndex = 0;

  var modulus, exponent;
  if (split.length === 2) {
    keyIndex = 0;
    modulus = split[1];
    exponent = split[0];
  } else {
    keyIndex = +split[0];
    modulus = split[2];
    exponent = split[1];
  }

  rsaKey.setPublic(modulus, exponent); // params specified in reverse order to how we defined the key

  this.keyIndex = keyIndex;
  this.rsaKey = rsaKey;

  // We also send a signature of the pub key so we can diagnose decryption failures (which are most often
  // caused by the client using the wrong keys in a certain environment).
  var sig = sjcl.hash.sha256.hash(rawPubKey);
  this.keySignature = sjcl.codec.hex.fromBits(sig);
};

/**
 * encrypt performs the encrypt process for the provided card details and prepares them to be sent
 * to Ravelin, with the resulting payload returned as a string.
 *
 * @param {Object} details An object containing properties pan, month, year and nameOnCard (optional).
 * @return {String} The encrypted payload to be sent to Ravelin.
 * @example
 * var encrypted = ravelinjs.encrypt({pan: "4111 1111 1111 1111", month: 1, year: 18});
 * console.log(encrypted);
 * > '{"methodType":"paymentMethodCipher","cardCiphertext":"abc.....xyz==","aesKeyCiphertext":"def....tuv==","algorithm":"RSA_WITH_AES_256_GCM","ravelinSDKVersion": "0.0.1-ravelinjs"}'
 */
RavelinJS.prototype.encrypt = function(details) {
  return JSON.stringify(this.encryptAsObject(details));
};

/**
 * encryptAsObject performs the encrypt process for the provided card details and prepares them to be sent
 * to Ravelin, with the resulting payload returned as an object.
 *
 * @param {Object} details An object containing properties pan, month, year and nameOnCard (optional).
 * @return {Object} The encrypted payload to be sent to Ravelin.
 * @example
 * var encrypted = ravelinjs.encryptAsObject({pan: "4111 1111 1111 1111", month: 1, year: 18});
 * console.log(encrypted);
 * > {
 * >  methodType: "paymentMethodCipher",
 * >  cardCiphertext: "abc.....xyz==",
 * >  aesKeyCiphertext: "def....tuv==",
 * >  algorithm: "RSA_WITH_AES_256_GCM",
 * >  ravelinSDKVersion: "0.0.1-ravelinjs",
 * >  keySignature: "ghi...qrs"
 * > }
 */
RavelinJS.prototype.encryptAsObject = function(details) {
  if (!this.rsaKey) {
    throw new Error('[ravelinjs] Encryption Key has not been set');
  }

  if (!details) {
    throw new Error('[ravelinjs] Encryption validation: no details provided');
  }

  if (details.pan) {
    details.pan = details.pan.toString().replace(/[^0-9]/g, '');
  }

  if (!details.pan || details.pan.length < 12) {
    throw new Error('[ravelinjs] Encryption validation: pan should have at least 12 digits');
  }

  // We accept the month as an int or string, specified as one or two digits.
  // We error if an invalid month is specified.
  if (typeof details.month == 'string') {
    details.month = parseInt(details.month, 10);
  }

  // Months in Javascript start at zero ;)
  if (!(details.month > 0 && details.month < 13)) {
    throw new Error('[ravelinjs] Encryption validation: month should be in the range 1-12');
  }

  // We accept year as an int or string, specified as either 2 digits (18) or 4 digits (2018).
  // We standardise the input to be 4 digits, erroring if after standardisation the 4 digit
  // year is not in the 21st century.
  if (typeof details.year === 'string') {
    details.year = parseInt(details.year, 10);
  }

  if (details.year > 0 && details.year < 100) {
    details.year += 2000;
  }

  if (!(details.year > 2000)) {
    throw new Error('[ravelinjs] Encryption validation: year should be in the 21st century');
  }

  for (var prop in details) {
    if (!details.hasOwnProperty(prop)) continue;
    switch (prop) {
      case 'pan':
      case 'year':
      case 'month':
      case 'nameOnCard':
        continue;
    }
    throw new Error('[ravelinjs] Encryption validation: encrypt only allows properties pan, year, month, nameOnCard');
  }

  details.month += '';
  details.year += '';

  // AES encrypt the card details, using a uniquely generated session key and IV.
  // The GCM auth tag is appended to the ciphertext. This key and IV are returned from this call as well
  // as the card detail ciphertext, all as base64.
  var aesResult = aesEncrypt(JSON.stringify(details));

  // RSA encrypt the key and IV from the previous step, as a single, pipe-delimited string.
  var rsaResultB64 = rsaEncrypt(this.rsaKey, aesResult.aesKeyB64, aesResult.ivB64);

  // This payload identically matches the structure we expect to be sent to the Ravelin API
  return {
    methodType: 'paymentMethodCipher',
    cardCiphertext: aesResult.ciphertextB64,
    aesKeyCiphertext: rsaResultB64,
    algorithm: 'RSA_WITH_AES_256_GCM',
    ravelinSDKVersion: FULL_VERSION_STRING,
    keyIndex: this.keyIndex,
    keySignature: this.keySignature
  };
};

// ========================================================================================================
//
// private functions
//

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

// ========================================================================================================
//
// initialisation
//
if ((typeof window !== 'undefined' && window.addEventListener) || (typeof document !== 'undefined' && document.attachEvent)) {
  sjcl.random.startCollectors();
}
