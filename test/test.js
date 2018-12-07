const expect = require('chai').expect;
const sinon = require('sinon');

const dummyRSAKey = '10001|BB2D2D2FD3812FEBECF8955843228A0E1952342583DFC02B8393475C414E16FDCBE8753BD63C164104785D8A67E344D495B5C0C622CE8D643F3191BC6BE0D3050F391F77E1D7E1B8F69DA34B308477E31F775CCC44158E33FD7DDD51AC87DD33AD80B9B1BF850CEC79A189F011C0689C36C0C91BF6DB9CD65BB7399710E32D9876C00DD44103E54A64A44BF427E1BA4F48DA7AF3D623DBCCF282ED8D4CCAE31B921A9BE92F9E8D7B5C50FBD89D828539CAE3E3493D4F6D7ADA19A876D9DF3801B5C3CFFA6A3C72A246150F307D789BAD6E2408DA5EF05EE805E11C133FFEDFA57CD1C35E49106ADDAC43C51995B9C318066C9ACB4042D8A534370D79F1BAD601';
const dummyRSAKeyWithIndex = '2|10001|BB2D2D2FD3812FEBECF8955843228A0E1952342583DFC02B8393475C414E16FDCBE8753BD63C164104785D8A67E344D495B5C0C622CE8D643F3191BC6BE0D3050F391F77E1D7E1B8F69DA34B308477E31F775CCC44158E33FD7DDD51AC87DD33AD80B9B1BF850CEC79A189F011C0689C36C0C91BF6DB9CD65BB7399710E32D9876C00DD44103E54A64A44BF427E1BA4F48DA7AF3D623DBCCF282ED8D4CCAE31B921A9BE92F9E8D7B5C50FBD89D828539CAE3E3493D4F6D7ADA19A876D9DF3801B5C3CFFA6A3C72A246150F307D789BAD6E2408DA5EF05EE805E11C133FFEDFA57CD1C35E49106ADDAC43C51995B9C318066C9ACB4042D8A534370D79F1BAD601';
const expectedVersion = '1.0.0';

describe('ravelinjs', function() {
  var ravelin;
  beforeEach('reset the ravelin library', function() {
    delete require.cache[require.resolve('../ravelin')];
    ravelin = require('../ravelin');
  });

  describe('setRSAKey', function() {
    it('should error when given a bad RSA key', function() {
      const err = '[ravelinjs] Invalid value provided to RavelinJS.setRSAKey';
      expect(() => ravelin.setRSAKey(123)).to.throw(err);
      expect(() => ravelin.setRSAKey('derp')).to.throw(err);
      expect(() => ravelin.setRSAKey('10001|asdf|wrong-format|heh')).to.throw(err);
      expect(() => ravelin.setRSAKey('10001')).to.throw(err);
    });
  });

  describe('customerId', function() {
    it('should get/set customerId', function() {
      ravelin.setCustomerId('hello');
      expect(ravelin.getCustomerId()).to.equal('hello');
    });

    it('should convert numerical customerId to string', function() {
      ravelin.setCustomerId('123');
      expect(ravelin.getCustomerId()).to.equal('123');
    });

    it('should ignore falsey customerId', function() {
      ravelin.setCustomerId(false);
      expect(ravelin.getCustomerId()).to.be.undefined;
    });

    it('should lowercase email customerId', function() {
      ravelin.setCustomerId('NoTLoWERcasE@Test.COM');
      expect(ravelin.getCustomerId()).to.equal('notlowercase@test.com');
    });
  });

  describe('orderId', function() {
    it('should get/set orderId', function() {
      ravelin.setOrderId('order123');
      expect(ravelin.getOrderId()).to.equal('order123');
    });

    it('should convert numerical orderId to string', function() {
      ravelin.setOrderId(123);
      expect(ravelin.getOrderId()).to.equal('123');
    });

    it('should ignore falsey orderId', function() {
      ravelin.setOrderId(false);
      expect(ravelin.getOrderId()).to.be.undefined;
    });
  });

  describe('tempCustomerId', function() {
    it('should get/set tempCustomerId', function() {
      ravelin.setTempCustomerId('hello');
      expect(ravelin.getTempCustomerId()).to.equal('hello');
    });

    it('should convert numerical tempCustomerId to string', function() {
      ravelin.setTempCustomerId('123');
      expect(ravelin.getTempCustomerId()).to.equal('123');
    });

    it('should ignore falsey tempCustomerId', function() {
      ravelin.setTempCustomerId(false);
      expect(ravelin.getTempCustomerId()).to.be.undefined;
    });

    it('should lowercase email tempCustomerId', function() {
      ravelin.setTempCustomerId('NoTLoWERcasE@Test.COM');
      expect(ravelin.getTempCustomerId()).to.equal('notlowercase@test.com');
    });
  });

  describe('encrypt', function() {
    it('checks rsa key has been set', function() {
      expect(() => ravelin.encrypt({})).to.throw('[ravelinjs] Encryption Key has not been set');
    });

    it('validates pan has at least 13 digits', function() {
      ravelin.setRSAKey(dummyRSAKey);
      const err = '[ravelinjs] Encryption validation: pan should have at least 13 digits';
      expect(() => ravelin.encrypt({})).to.throw(err);
      expect(() => ravelin.encrypt({pan: '4111 1111'})).to.throw(err);
    });

    it('validates month is in the range 1-12', function() {
      ravelin.setRSAKey(dummyRSAKey);
      const err = '[ravelinjs] Encryption validation: month should be in the range 1-12';
      expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111'})).to.throw(err);
      expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111', month: 0})).to.throw(err);
      expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111', month: 13})).to.throw(err);
    });

    it('validates year is in the 21st century', function() {
      ravelin.setRSAKey(dummyRSAKey);
      const err = '[ravelinjs] Encryption validation: year should be in the 21st century';
      expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111', month: 1})).to.throw(err);
      expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111', month: 1, year: -1})).to.throw(err);
      expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111', month: 1, year: 'yesteryear'})).to.throw(err);
    });

    it('validates no unknown attributes are present', function() {
      ravelin.setRSAKey(dummyRSAKey);

      const err = '[ravelinjs] Encryption validation: encrypt only allows properties pan, year, month, nameOnCard';
      expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111', month: 1, year: '18', 'cvv': '123'})).to.throw(err);
    });

    it('generates ciphers', function() {
      ravelin.setRSAKey(dummyRSAKey);

      expect(JSON.parse(ravelin.encrypt({
        pan: '4111 1111 1111 1111',
        month: 10,
        year: 2020,
      }))).to.satisfy(validateCipher);

      expect(JSON.parse(ravelin.encrypt({
        pan: '4111 1111 1111 1111',
        month: '10',
        year: '20',
      }))).to.satisfy(validateCipher);

      expect(JSON.parse(ravelin.encrypt({
        pan: '4111 1111 1111 1111',
        month: '12',
        year: '20',
      }))).to.satisfy(validateCipher);
    });

    it('can return payload as object', function() {
      ravelin.setRSAKey(dummyRSAKey);

      expect(ravelin.encryptAsObject({
          pan: '4111 1111 1111 1111',
          month: 10,
          year: 2020,
      })).to.satisfy(validateCipher);
    });

    it('can parse key index and include in payload', function() {
      ravelin.setRSAKey(dummyRSAKeyWithIndex);
      result = ravelin.encryptAsObject({
        pan: '4111 1111 1111 1111',
        month: 10,
        year: 2020,
      });

      expect(result.keyIndex).to.eq(2);
    });
  });

  describe('track', function() {
    let server;
    let pageTitle;
    let reqs = [];

    server = sinon.fakeServer.create();
    server.respondImmediately = true;

    beforeEach(() => {
      global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();
      global.XMLHttpRequest.onCreate = req => { reqs.push(req) };
      ravelin.setPublicAPIKey('testAPIKey');
    });

    afterEach(() => {
      global.XMLHttpRequest.restore();
      reqs = [];
    });

    it('sends track data to ravelin', () => {
      let callbackTrigged = false;

      ravelin.setCustomerId(123456789);
      ravelin.setTempCustomerId('foobar');
      ravelin.setOrderId('fooOrder');
      ravelin.track('fooEvent', {extra: 'stuff', things: 2}, _ => callbackTrigged = true);

      const trackReq = reqs[0];
      /*trackReq.respond(200, { 'Content-Type': 'application/json' }, '');

      expect(callbackTrigged).toBe(true);

      const body = JSON.parse(trackReq.requestBody).events[0];

      assertTrackRequestBody(body, {
        eventType: 'track',
        customerId: '123456789',
        tempCustomerId: 'foobar',
        orderId: 'fooOrder',
        libVer: expectedVersion,
        eventData: {
          eventName: 'fooEvent',
          properties: {
            extra: 'stuff',
            things: 2
          },
        },
        eventMeta: {
          trackingSource: 'browser',
          pageTitle: pageTitle
        }
      });*/
    });
  });

});

function assertUuid(uuid) {
  expect(uuid).toBeTruthy();

  // all UUIDs have a 4 here
  expect(uuid.charAt(14)).toBe('4');
  expect(uuid.length).toBe(36);
  // this one is taken :)
  expect(uuid).not.toBe('83791e77-610c-4285-b196-da07b2cc4a18');
}

function assertTimestamps(mills, mics) {
  expect(mills).toBeTruthy();
  expect(mics).toBeTruthy();
  expect(mills).toEqual(jasmine.any(Number));
  expect(mics).toEqual(jasmine.any(Number));

  // This is when I wrote the tests.
  expect(mills).toBeGreaterThan(1492599800317);
  expect(mics).toBeGreaterThan(1492599800317304);

  expect((mics/1000)).not.toBeGreaterThan(mills+2);
  expect((mics/1000)).not.toBeLessThan(mills-2);
}

function assertTrackRequestBody(body, expected) {
  assertUuid(body.eventMeta.ravelinDeviceId);
  assertUuid(body.eventMeta.ravelinSessionId);
  assertUuid(body.eventMeta.ravelinWindowId);
  expect(body.eventMeta.ravelinDeviceId).not.toBe(body.eventMeta.ravelinSessionId);
  expect(body.eventMeta.ravelinDeviceId).not.toBe(body.eventMeta.ravelinWindowId);
  expect(body.eventMeta.ravelinWindowId).not.toBe(body.eventMeta.ravelinSessionId);

  assertTimestamps(body.eventMeta.clientEventTimeMilliseconds, body.eventMeta.clientEventTimeMicroseconds);

  expect(body.eventMeta.url).toContain('http');
  expect(body.eventMeta.url).toContain('localhost');

  expect(body.eventMeta.canonicalUrl).toEqual('http://example.com/');

  // Delete uuids and timestamps so we can assert on the rest of it.
  delete body.eventMeta.ravelinDeviceId;
  delete body.eventMeta.ravelinSessionId;
  delete body.eventMeta.ravelinWindowId;
  delete body.eventMeta.clientEventTimeMilliseconds;
  delete body.eventMeta.clientEventTimeMicroseconds;
  delete body.eventMeta.referrer;
  delete body.eventMeta.url; // Karma might run on a different port.
  delete body.eventMeta.canonicalUrl;

  expect(body).toEqual(expected);
}

function validateCipher(c) {
  return c.methodType == 'paymentMethodCipher' &&
         c.cardCiphertext != '' && c.cardCiphertext.length > 10 &&
         c.aesKeyCiphertext != '' && c.aesKeyCiphertext.length > 10 &&
         c.algorithm == 'RSA_WITH_AES_256_GCM' &&
         c.ravelinSDKVersion == '1.0.0-ravelinjs' &&
         typeof(c.keyIndex) === 'number';
}
