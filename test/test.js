const expect = require('chai').expect;
const sinon = require('sinon');

const dummyRSAKey = '10001|BB2D2D2FD3812FEBECF8955843228A0E1952342583DFC02B8393475C414E16FDCBE8753BD63C164104785D8A67E344D495B5C0C622CE8D643F3191BC6BE0D3050F391F77E1D7E1B8F69DA34B308477E31F775CCC44158E33FD7DDD51AC87DD33AD80B9B1BF850CEC79A189F011C0689C36C0C91BF6DB9CD65BB7399710E32D9876C00DD44103E54A64A44BF427E1BA4F48DA7AF3D623DBCCF282ED8D4CCAE31B921A9BE92F9E8D7B5C50FBD89D828539CAE3E3493D4F6D7ADA19A876D9DF3801B5C3CFFA6A3C72A246150F307D789BAD6E2408DA5EF05EE805E11C133FFEDFA57CD1C35E49106ADDAC43C51995B9C318066C9ACB4042D8A534370D79F1BAD601';
const dummyRSAKeyWithIndex = '2|10001|BB2D2D2FD3812FEBECF8955843228A0E1952342583DFC02B8393475C414E16FDCBE8753BD63C164104785D8A67E344D495B5C0C622CE8D643F3191BC6BE0D3050F391F77E1D7E1B8F69DA34B308477E31F775CCC44158E33FD7DDD51AC87DD33AD80B9B1BF850CEC79A189F011C0689C36C0C91BF6DB9CD65BB7399710E32D9876C00DD44103E54A64A44BF427E1BA4F48DA7AF3D623DBCCF282ED8D4CCAE31B921A9BE92F9E8D7B5C50FBD89D828539CAE3E3493D4F6D7ADA19A876D9DF3801B5C3CFFA6A3C72A246150F307D789BAD6E2408DA5EF05EE805E11C133FFEDFA57CD1C35E49106ADDAC43C51995B9C318066C9ACB4042D8A534370D79F1BAD601';
const expectedVersion = '1.0.0-ravelinjs';

describe('ravelinjs', function() {
  var ravelin;

  beforeEach('reset the ravelin library', function() {
    // Ensure we always start tests without access to document/window (some tests will be stubbing them)
    document = undefined;
    window = undefined;

    // reinstantiate a fresh ravelinjs instance at the start of every test in every suite
    delete require.cache[require.resolve('../ravelin')];
    ravelin = require('../ravelin');
  });

  describe('tracking IDs', function() {
    it('should set ids on instantiation', function() {
      assertDeviceId(ravelin.getDeviceId());
      assertUuid(ravelin.getSessionId());
    });

    it('should load deviceId from cookie', function() {
      document = {
        cookie: 'notDeviceId=not; ravelinDeviceId=rjs-123-abc'
      };

      // reset instance so we can instantiate from cookie
      delete require.cache[require.resolve('../ravelin')];
      ravelin = require('../ravelin');

      expect(ravelin.getDeviceId()).to.equal('rjs-123-abc');
    });

    it('should store deviceId in instance and write back to cookies if absent', function() {
      // deviceId is set during instantiation, read the value our before we clear our cookies
      var pre = ravelin.getDeviceId();

      // clear our cookies
      document = { cookie: '' };

      // assert that the deviceId hasn't changed despite clearing cookies
      var post = ravelin.getDeviceId();
      assertDeviceId(pre);
      assertDeviceId(post);
      expect(pre).to.equal(post);

      // assert that setting our deviceId again updates our cookies
      ravelin.setDeviceId();
      expect(document.cookie).to.contain('ravelinDeviceId=rjs-');
    });

    it('should load sessionId from cookie', function() {
      document = {
        cookie: 'notDeviceId=not; ravelinDeviceId=rjs-123-abc; ravelinSessionId=345-zyx'
      };

      // reset instance so we can instantiate from cookie
      delete require.cache[require.resolve('../ravelin')];
      ravelin = require('../ravelin');

      expect(ravelin.getSessionId()).to.equal('345-zyx');
    });

    it('should store session in instance and write back to cookies if absent', function() {
      // session is set during instantiation, read the value our before we clear our cookies
      var pre = ravelin.getSessionId();

      // clear our cookies
      document = { cookie: '' };

      var post = ravelin.getSessionId();

      // assert that the sessionId hasn't changed despite clearing cookies
      assertUuid(pre);
      assertUuid(post);
      expect(pre).to.equal(post);

      // assert that setting our sessionId again updates our cookies
      ravelin.setSessionId();
      expect(document.cookie).to.contain('ravelinSessionId=');
    });
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

    it('validates card details exist', function() {
      ravelin.setRSAKey(dummyRSAKey);
      const err = '[ravelinjs] Encryption validation: no details provided';
      expect(() => ravelin.encrypt(null)).to.throw(err);
      expect(() => ravelin.encrypt(undefined)).to.throw(err);
      expect(() => ravelin.encrypt(false)).to.throw(err);
    });

    it('ignores card details exist', function() {
      ravelin.setRSAKey(dummyRSAKey);
      const err = '[ravelinjs] Encryption validation: no details provided';
      expect(() => ravelin.encrypt(null)).to.throw(err);
      expect(() => ravelin.encrypt(undefined)).to.throw(err);
      expect(() => ravelin.encrypt(false)).to.throw(err);
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

      var testCases = [
        { pan: 4111111111111111, month: 10, year: 2020 },
        { pan: '4111-1111-1111-1111', month: 10, year: 2020 },
        { pan: '4111111111111111', month: 10, year: 2020 },
        { pan: '4111 1111 1111 1111', month: 10, year: 2020 },
        { pan: '4111 1111 1111 1111', month: 10, year: '20' },
        { pan: '4111 1111 1111 1111', month: '12', year: '20' }
      ];

      for (var testCase of testCases) {
        result = ravelin.encrypt(testCase);

        expect(result).to.satisfy(validateJSONCipher);
      }
    });

    it('can return payload as object', function() {
      ravelin.setRSAKey(dummyRSAKey);

      var result = ravelin.encryptAsObject({
          pan: '4111 1111 1111 1111',
          month: 10,
          year: 2020,
      });

      expect(result).to.satisfy(validateCipher);
    });

    it('can parse key index and include in payload', function() {
      ravelin.setRSAKey(dummyRSAKeyWithIndex);
      result = ravelin.encryptAsObject({
        pan: '4111 1111 1111 1111',
        month: 10,
        year: 2020,
      });

      expect(result.keyIndex).to.eq(2);
      expect(result).to.satisfy(validateCipher);
    });
  });

  describe('track', function() {
    let server;
    let reqs = [];

    beforeEach(() => {
      server = sinon.fakeServer.create();
      server.respondImmediately = true;
      global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();
      global.XMLHttpRequest.onCreate = req => {
        req.withCredentials = true;
        reqs.push(req)
      };
      ravelin.setPublicAPIKey('testAPIKey');
    });

    afterEach(() => {
      global.XMLHttpRequest.restore();
      reqs = [];
    });

    it('sends full tracking data to Ravelin for custom track event', () => {
      ravelin.setCustomerId(123456789);
      ravelin.setTempCustomerId('foobar');
      ravelin.setOrderId('fooOrder');
      ravelin.track('fooEvent', {extra: 'stuff', things: 2});

      const trackReq = reqs[0];
      trackReq.respond(200, { 'Content-Type': 'application/json' }, '');

      expect(trackReq.url).to.equal('https://api.ravelin.com/v2/click');
      expect(trackReq.method).to.equal('POST');

      const body = JSON.parse(trackReq.requestBody).events[0];

      assertTrackRequestBody(body, {
        libVer: expectedVersion,
        customerId: '123456789',
        tempCustomerId: 'foobar',
        orderId: 'fooOrder',
        eventType: 'track',
        eventData: {
          eventName: 'fooEvent',
          properties: {
            extra: 'stuff',
            things: 2
          },
        },
        eventMeta: {
          trackingSource: 'browser',
        }
      });
    });
  });

  describe('track fingerprint', function() {
    let server;
    let reqs = [];

    beforeEach(() => {
      server = sinon.fakeServer.create();
      server.respondImmediately = true;
      global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();
      global.XMLHttpRequest.onCreate = req => {
        req.withCredentials = true;
        reqs.push(req)
      };
      ravelin.setPublicAPIKey('testAPIKey');
    });

    afterEach(() => {
      global.XMLHttpRequest.restore();
      reqs = [];
    });

    it('fails gracefully and sends error to ravelin', () => {
      ravelin.trackFingerprint(123456789);

      const trackReq = reqs[0];
      trackReq.respond(200, { 'Content-Type': 'application/json' }, '');

      expect(trackReq.url).to.equal('https://api.ravelin.com/v2/fingerprinterror?source=browser');
      expect(trackReq.method).to.equal('POST');

      const body = JSON.parse(trackReq.requestBody);

      assertDeviceId(body.deviceId);
      assertUuid(body.sessionId);
      assertUuid(body.windowId);
      expect(body.libVer).to.equal(expectedVersion);
      expect(body.fingerprintSource).to.equal('browser');
      expect(body.customerId).to.equal('123456789');
      expect(body.error).to.contain('ReferenceError: Fingerprint2 is not defined\n');
    });
  });

});

function assertDeviceId(deviceId) {
  expect(deviceId).to.have.lengthOf(40);

    // We have special logic around 2 specific values in our ids, reference the uuid() func comments
  expect(deviceId.charAt(18)).to.equal('4');
  expect(deviceId.charAt(23)).to.be.oneOf(['8', '9', 'a', 'b']);

  // this one is taken :)
  expect(deviceId).not.to.equal('rjs-83791e77-610c-4285-b196-da07b2cc4a18');
}

function assertUuid(uuid) {
  expect(uuid).to.have.lengthOf(36);

  // We have special logic around 2 specific values in our ids, reference the uuid() func comments
  expect(uuid.charAt(14)).to.equal('4');
  expect(uuid.charAt(19)).to.be.oneOf(['8', '9', 'a', 'b']);

  // this one is taken :)
  expect(uuid).not.to.equal('83791e77-610c-4285-b196-da07b2cc4a18');
}

function assertTimestamp(mills) {
  expect(mills).not.to.be.undefined;

  // Sensible bounds check for between the time these tests were written and 2025.
  expect(mills).to.be.greaterThan(1544186420643);
  expect(mills).not.to.be.lessThan(1767139200);
}

function assertTrackRequestBody(body, expected) {
  assertDeviceId(body.eventMeta.ravelinDeviceId);
  assertUuid(body.eventMeta.ravelinSessionId);
  assertUuid(body.eventMeta.ravelinWindowId);
  expect(body.eventMeta.ravelinDeviceId).not.to.equal(body.eventMeta.ravelinSessionId);
  expect(body.eventMeta.ravelinDeviceId).not.to.equal(body.eventMeta.ravelinWindowId);
  expect(body.eventMeta.ravelinWindowId).not.to.equal(body.eventMeta.ravelinSessionId);

  assertTimestamp(body.eventMeta.clientEventTimeMilliseconds);

  // Delete uuids and timestamps so we can assert on the rest of it.
  delete body.eventMeta.ravelinDeviceId;
  delete body.eventMeta.ravelinSessionId;
  delete body.eventMeta.ravelinWindowId;
  delete body.eventMeta.clientEventTimeMilliseconds;
  delete body.eventMeta.clientEventTimeMicroseconds;

  expect(body).to.eql(expected);
}

function validateCipher(c) {
  return c.methodType == 'paymentMethodCipher' &&
         c.cardCiphertext != '' && c.cardCiphertext.length > 10 &&
         c.aesKeyCiphertext != '' && c.aesKeyCiphertext.length > 10 &&
         c.algorithm == 'RSA_WITH_AES_256_GCM' &&
         c.ravelinSDKVersion == '1.0.0-ravelinjs' &&
         typeof(c.keyIndex) === 'number';
}

function validateJSONCipher(j) {
  return validateCipher(JSON.parse(j));
}

