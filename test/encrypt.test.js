var dummyRSAKey = '10001|BB2D2D2FD3812FEBECF8955843228A0E1952342583DFC02B8393475C414E16FDCBE8753BD63C164104785D8A67E344D495B5C0C622CE8D643F3191BC6BE0D3050F391F77E1D7E1B8F69DA34B308477E31F775CCC44158E33FD7DDD51AC87DD33AD80B9B1BF850CEC79A189F011C0689C36C0C91BF6DB9CD65BB7399710E32D9876C00DD44103E54A64A44BF427E1BA4F48DA7AF3D623DBCCF282ED8D4CCAE31B921A9BE92F9E8D7B5C50FBD89D828539CAE3E3493D4F6D7ADA19A876D9DF3801B5C3CFFA6A3C72A246150F307D789BAD6E2408DA5EF05EE805E11C133FFEDFA57CD1C35E49106ADDAC43C51995B9C318066C9ACB4042D8A534370D79F1BAD601';
var expectedVersion = /^\d+.\d+.\d+(-.+)?-ravelinjs$/;

describe('ravelin.encrypt', function() {
  describe('#card', function() {
    it('validates it has an rsaKey', function() {
      var ravelin = new Ravelin({
        api: '/',
        key: 'encrypt'
        // rsaKey: ...
      });
      expect(function() { ravelin.encrypt.card({}); }).to.throwException(/ravelin\/encrypt: no rsaKey provided/);
    });

    it('validates card details exist', function() {
      var ravelin = new Ravelin({
        api: '/',
        key: 'encrypt',
        rsaKey: dummyRSAKey
      });
      var err = /ravelin\/encrypt: card is required/;
      expect(function() { ravelin.encrypt.card(null); }).to.throwException(err);
      expect(function() { ravelin.encrypt.card(undefined); }).to.throwException(err);
      expect(function() { ravelin.encrypt.card(false); }).to.throwException(err);
    });

    it('validates pan has at least 12 digits', function() {
      var ravelin = new Ravelin({
        api: '/',
        key: 'encrypt',
        rsaKey: dummyRSAKey
      });
      var err = /ravelin\/encrypt: card.pan should have at least 12 digits/;
      expect(function() { ravelin.encrypt.card({}); }).to.throwException(err);
      expect(function() { ravelin.encrypt.card({pan: '4111 1111'}); }).to.throwException(err);
    });

    it('validates month is in the range 1-12', function() {
      var ravelin = new Ravelin({
        api: '/',
        key: 'encrypt',
        rsaKey: dummyRSAKey
      });
      var err = /ravelin\/encrypt: card.month should be in the range 1-12/;
      expect(function() { ravelin.encrypt.card({pan: '4111 1111 1111 1111'}); }).to.throwException(err);
      expect(function() { ravelin.encrypt.card({pan: '4111 1111 1111 1111', month: 0}); }).to.throwException(err);
      expect(function() { ravelin.encrypt.card({pan: '4111 1111 1111 1111', month: 13}); }).to.throwException(err);
    });

    it('validates year is in the 21st century', function() {
      var ravelin = new Ravelin({
        api: '/',
        key: 'encrypt',
        rsaKey: dummyRSAKey
      });
      var err = /ravelin\/encrypt: card.year should be in the 21st century/;
      expect(function() { ravelin.encrypt.card({pan: '4111 1111 1111 1111', month: 1}); }).to.throwException(err);
      expect(function() { ravelin.encrypt.card({pan: '4111 1111 1111 1111', month: 1, year: -1}); }).to.throwException(err);
      expect(function() { ravelin.encrypt.card({pan: '4111 1111 1111 1111', month: 1, year: 'yesteryear'}); }).to.throwException(err);
    });

    it('validates no unknown attributes are present', function() {
      var ravelin = new Ravelin({
        api: '/',
        key: 'encrypt',
        rsaKey: dummyRSAKey
      });

      var err = /ravelin\/encrypt: unrecognised property cvv/;
      expect(function() { ravelin.encrypt.card({pan: '4111 1111 1111 1111', month: 1, year: '18', 'cvv': '123'}); }).to.throwException(err);
    });

    it('errors if generators arent seeded', function() {
      if (window.crypto || window.msCrypto) {
        this.skip('Only applies to browsers without crypto.');
      }

      var ravelin = new Ravelin({
        api: '/',
        key: 'encrypt',
        rsaKey: dummyRSAKey
      });
      expect(function() {
        ravelin.encrypt.card({
          pan: 4111111111111111,
          month: 10,
          year: 2020
        });
      }).to.throwException(/ravelin\/encrypt: generator not ready/);
    });

    it('generates ciphers', function() {
      if (!window.crypto && !window.msCrypto) {
        this.skip('TODO: seed some randomness for IE8-10');
      }
      var ravelin = new Ravelin({
        api: '/',
        key: 'encrypt',
        rsaKey: dummyRSAKey
      });

      var testCases = [
        { pan: 4111111111111111, month: 10, year: 2020 },
        { pan: '4111-1111-1111-1111', month: 10, year: 2020 },
        { pan: '4111111111111111', month: 10, year: 2020 },
        { pan: '4111 1111 1111 1111', month: 10, year: 2020 },
        { pan: '4111 1111 1111 1111', month: 10, year: '20' },
        { pan: '4111 1111 1111 1111', month: '12', year: '20' }
      ];

      for (var i = 0; i < testCases.length; i++) {
        var result = ravelin.encrypt.card(testCases[i]);
        expectCipher(result);
      }
    });

    it('includes key index in cipher', function() {
      if (!window.crypto && !window.msCrypto) {
        this.skip('TODO: seed some randomness for IE8-10');
      }
      var dummyRDAKeyWithIndex = '2|10001|BB2D2D2FD3812FEBECF8955843228A0E1952342583DFC02B8393475C414E16FDCBE8753BD63C164104785D8A67E344D495B5C0C622CE8D643F3191BC6BE0D3050F391F77E1D7E1B8F69DA34B308477E31F775CCC44158E33FD7DDD51AC87DD33AD80B9B1BF850CEC79A189F011C0689C36C0C91BF6DB9CD65BB7399710E32D9876C00DD44103E54A64A44BF427E1BA4F48DA7AF3D623DBCCF282ED8D4CCAE31B921A9BE92F9E8D7B5C50FBD89D828539CAE3E3493D4F6D7ADA19A876D9DF3801B5C3CFFA6A3C72A246150F307D789BAD6E2408DA5EF05EE805E11C133FFEDFA57CD1C35E49106ADDAC43C51995B9C318066C9ACB4042D8A534370D79F1BAD601';
      var ravelin = new Ravelin({
        api: '/',
        key: 'encrypt',
        rsaKey: dummyRDAKeyWithIndex
      });
      var result = ravelin.encrypt.card({
        pan: '4111 1111 1111 1111',
        month: 10,
        year: 2020
      });
      expect(result.keyIndex).to.eql(2);
      expectCipher(result);
    });

    it('is different each call', function() {
      if (!window.crypto && !window.msCrypto) {
        this.skip('TODO: seed some randomness for IE8-10');
      }
      var ravelin = new Ravelin({
        api: '/',
        key: 'encrypt',
        rsaKey: dummyRSAKey
      });
      var input = {
        pan: '4111 1111 1111 1111',
        month: 10,
        year: 2020
      };

      var outputA = ravelin.encrypt.card(input);
      var outputB = ravelin.encrypt.card(input);

      expectCipher(outputA);
      expectCipher(outputB);
      expect(JSON.stringify(outputA)).not.to.equal(JSON.stringify(outputB));
    });
  });
});

function expectCipher(c) {
  expect(c).to.have.property('methodType', 'paymentMethodCipher');
  expect(c).to.have.property('algorithm', 'RSA_WITH_AES_256_GCM');
  expect(c.ravelinSDKVersion).to.match(expectedVersion);

  expect(c.cardCiphertext).to.a('string');
  expect(c.cardCiphertext.length).to.be.above(10);
  expect(c.aesKeyCiphertext).to.a('string');
  expect(c.aesKeyCiphertext.length).to.be.above(10);
  expect(c.keySignature).to.have.length(64);
  expect(c.keyIndex).to.be.a('number');
}
