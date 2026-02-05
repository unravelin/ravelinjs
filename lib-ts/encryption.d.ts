declare namespace encryption {
  interface RSAKey {
    setPublic(modulus: string, exponent: string): void;
    encrypt(text: string): string | null;
  }

  interface RSAKeyStatic {
    new (): RSAKey;
  }

  type SjclBitArray = number[];

  interface SjclException {
    new (message: string): Error;
    toString(): string;
    message: string;
  }

  interface SjclCipher {
    encrypt(data: SjclBitArray): SjclBitArray;
    decrypt(data: SjclBitArray): SjclBitArray;
  }

  interface SjclCipherStatic {
    new (key: SjclBitArray): SjclCipher;
  }

  interface SjclHash {
    reset(): SjclHash;
    update(data: string | SjclBitArray): SjclHash;
    finalize(): SjclBitArray;
  }

  interface SjclHashStatic {
    new (hash?: SjclHash): SjclHash;
    hash(data: string | SjclBitArray): SjclBitArray;
  }

  interface SjclHmac {
    encrypt(data: SjclBitArray | string): SjclBitArray;
    mac(data: SjclBitArray | string): SjclBitArray;
    reset(): void;
    update(data: SjclBitArray | string): void;
    digest(): SjclBitArray;
  }

  interface SjclHmacStatic {
    new (key: SjclBitArray | string, Hash?: SjclHashStatic): SjclHmac;
  }

  interface SjclMode {
    encrypt(
      prp: SjclCipher,
      plaintext: SjclBitArray,
      iv: SjclBitArray,
      adata: SjclBitArray | null,
      tagSize?: number
    ): SjclBitArray;
    decrypt(
      prp: SjclCipher,
      ciphertext: SjclBitArray,
      iv: SjclBitArray,
      adata: SjclBitArray | null,
      tagSize?: number
    ): SjclBitArray;
  }

  interface SjclCodec {
    toBits(value: string): SjclBitArray;
    fromBits(bits: SjclBitArray): string;
  }

  interface SjclCodecBase64 {
    toBits(value: string, url?: boolean): SjclBitArray;
    fromBits(bits: SjclBitArray, noEquals?: boolean, url?: boolean): string;
  }

  interface SjclRandom {
    randomWords(len: number, paranoia?: number): SjclBitArray;
    addEntropy(data: number | number[] | string, entropy: number, source: string): void;
    isReady(paranoia?: number): number;
    getProgress(paranoia?: number): number;
    startCollectors(): void;
    stopCollectors(): void;
    addEventListener(name: string, listener: (entropy: number, source: string) => void): void;
    removeEventListener(name: string, listener: (entropy: number, source: string) => void): void;
  }

  interface SjclJsonParams {
    v?: number;
    iter?: number;
    ks?: number;
    ts?: number;
    mode?: string;
    adata?: string;
    cipher?: string;
    salt?: string;
    iv?: string;
    [key: string]: any;
  }

  interface Sjcl {
    cipher: {
      aes: SjclCipherStatic;
    };
    hash: {
      sha256: SjclHashStatic;
    };
    keyexchange: any;
    mode: {
      ccm: SjclMode;
      ocb2: SjclMode;
      gcm: SjclMode;
    };
    misc: {
      hmac: SjclHmacStatic;
      pbkdf2(
        password: string | SjclBitArray,
        salt: string | SjclBitArray,
        count?: number,
        length?: number,
        prff?: SjclHmac
      ): SjclBitArray;
      cachedPbkdf2(
        password: string,
        obj: SjclJsonParams
      ): { key: SjclBitArray; salt: SjclBitArray };
    };
    codec: {
      utf8String: SjclCodec;
      hex: SjclCodec;
      base32: SjclCodecBase64;
      base32hex: SjclCodecBase64;
      base64: SjclCodecBase64;
      base64url: SjclCodecBase64;
    };
    exception: {
      corrupt: SjclException;
      invalid: SjclException;
      bug: SjclException;
      notReady: SjclException;
    };
    bitArray: {
      bitSlice(a: SjclBitArray, bstart: number, bend?: number): SjclBitArray;
      extract(a: SjclBitArray, bstart: number, blength: number): number;
      concat(a: SjclBitArray, b: SjclBitArray): SjclBitArray;
      bitLength(a: SjclBitArray): number;
      clamp(a: SjclBitArray, len: number): SjclBitArray;
      partial(len: number, v: number, _end?: number): number;
      getPartial(x: number): number;
      equal(a: SjclBitArray, b: SjclBitArray): boolean;
      byteswapM(a: SjclBitArray): SjclBitArray;
    };
    random: SjclRandom;
    json: {
      defaults: SjclJsonParams;
      encrypt(
        password: string | SjclBitArray,
        plaintext: string | SjclBitArray,
        params?: SjclJsonParams,
        rp?: any
      ): string; // Returns JSON string
      decrypt(
        password: string | SjclBitArray,
        ciphertext: string,
        params?: SjclJsonParams,
        rp?: any
      ): string | SjclBitArray;
      encode(obj: any): string;
      decode(str: string): any;
    };
    encrypt(
      password: string | SjclBitArray,
      plaintext: string | SjclBitArray,
      params?: SjclJsonParams,
      rp?: any
    ): string;
    decrypt(
      password: string | SjclBitArray,
      ciphertext: string,
      params?: SjclJsonParams,
      rp?: any
    ): string;
  }
}
