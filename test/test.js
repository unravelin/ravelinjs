const expect = require('chai').expect;
const dummyRSAKey = '10001|BB2D2D2FD3812FEBECF8955843228A0E1952342583DFC02B8393475C414E16FDCBE8753BD63C164104785D8A67E344D495B5C0C622CE8D643F3191BC6BE0D3050F391F77E1D7E1B8F69DA34B308477E31F775CCC44158E33FD7DDD51AC87DD33AD80B9B1BF850CEC79A189F011C0689C36C0C91BF6DB9CD65BB7399710E32D9876C00DD44103E54A64A44BF427E1BA4F48DA7AF3D623DBCCF282ED8D4CCAE31B921A9BE92F9E8D7B5C50FBD89D828539CAE3E3493D4F6D7ADA19A876D9DF3801B5C3CFFA6A3C72A246150F307D789BAD6E2408DA5EF05EE805E11C133FFEDFA57CD1C35E49106ADDAC43C51995B9C318066C9ACB4042D8A534370D79F1BAD601';
const dummyRSAKeyWithIndex = '2|10001|BB2D2D2FD3812FEBECF8955843228A0E1952342583DFC02B8393475C414E16FDCBE8753BD63C164104785D8A67E344D495B5C0C622CE8D643F3191BC6BE0D3050F391F77E1D7E1B8F69DA34B308477E31F775CCC44158E33FD7DDD51AC87DD33AD80B9B1BF850CEC79A189F011C0689C36C0C91BF6DB9CD65BB7399710E32D9876C00DD44103E54A64A44BF427E1BA4F48DA7AF3D623DBCCF282ED8D4CCAE31B921A9BE92F9E8D7B5C50FBD89D828539CAE3E3493D4F6D7ADA19A876D9DF3801B5C3CFFA6A3C72A246150F307D789BAD6E2408DA5EF05EE805E11C133FFEDFA57CD1C35E49106ADDAC43C51995B9C318066C9ACB4042D8A534370D79F1BAD601';

describe('ravelinjs', function() {
    var ravelin;
    beforeEach('reset the ravelin library', function() {
        delete require.cache[require.resolve('../ravelin')];
        ravelin = require('../ravelin');
    });

    describe('setRSAKey', function() {
        it('should error when given a bad RSA key', function() {
            const err = 'Invalid value provided to RavelinJS.setRSAKey';
            expect(() => ravelin.setRSAKey(123)).to.throw(err);
            expect(() => ravelin.setRSAKey('derp')).to.throw(err);
            expect(() => ravelin.setRSAKey('10001|asdf|wrong-format|heh')).to.throw(err);
            expect(() => ravelin.setRSAKey('10001')).to.throw(err);
        });
    });

    describe('encrypt', function() {
        it('checks rsa key has been set', function() {
            expect(() => ravelin.encrypt({})).to.throw('RavelinJS Key has not been set');
        });

        it('validates pan has at least 13 digits', function() {
            ravelin.setRSAKey(dummyRSAKey);
            const err = 'RavelinJS validation: pan should have at least 13 digits';
            expect(() => ravelin.encrypt({})).to.throw(err);
            expect(() => ravelin.encrypt({pan: '4111 1111'})).to.throw(err);
        });

        it('validates month is in the range 1-12', function() {
            ravelin.setRSAKey(dummyRSAKey);
            const err = 'RavelinJS validation: month should be in the range 1-12';
            expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111'})).to.throw(err);
            expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111', month: 0})).to.throw(err);
            expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111', month: 13})).to.throw(err);
        });

        it('validates year is in the 21st century', function() {
            ravelin.setRSAKey(dummyRSAKey);
            const err = 'RavelinJS validation: year should be in the 21st century';
            expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111', month: 1})).to.throw(err);
            expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111', month: 1, year: -1})).to.throw(err);
            expect(() => ravelin.encrypt({pan: '4111 1111 1111 1111', month: 1, year: 'yesteryear'})).to.throw(err);
        });

        it('validates no unknown attributes are present', function() {
            ravelin.setRSAKey(dummyRSAKey);

            const err = 'RavelinJS validation: encrypt only allows properties pan, year, month, nameOnCard';
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

});

function validateCipher(c) {
  return c.methodType == 'paymentMethodCipher' &&
         c.cardCiphertext != '' && c.cardCiphertext.length > 10 &&
         c.aesKeyCiphertext != '' && c.aesKeyCiphertext.length > 10 &&
         c.algorithm == 'RSA_WITH_AES_256_GCM' &&
         c.ravelinSDKVersion == '0.0.11-ravelinjs' &&
         typeof(c.keyIndex) === 'number';
}
