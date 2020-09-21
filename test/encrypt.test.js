var dummyRSAKey = '10001|BB2D2D2FD3812FEBECF8955843228A0E1952342583DFC02B8393475C414E16FDCBE8753BD63C164104785D8A67E344D495B5C0C622CE8D643F3191BC6BE0D3050F391F77E1D7E1B8F69DA34B308477E31F775CCC44158E33FD7DDD51AC87DD33AD80B9B1BF850CEC79A189F011C0689C36C0C91BF6DB9CD65BB7399710E32D9876C00DD44103E54A64A44BF427E1BA4F48DA7AF3D623DBCCF282ED8D4CCAE31B921A9BE92F9E8D7B5C50FBD89D828539CAE3E3493D4F6D7ADA19A876D9DF3801B5C3CFFA6A3C72A246150F307D789BAD6E2408DA5EF05EE805E11C133FFEDFA57CD1C35E49106ADDAC43C51995B9C318066C9ACB4042D8A534370D79F1BAD601';
var dummyRSAKeyWithIndex = '2|10001|BB2D2D2FD3812FEBECF8955843228A0E1952342583DFC02B8393475C414E16FDCBE8753BD63C164104785D8A67E344D495B5C0C622CE8D643F3191BC6BE0D3050F391F77E1D7E1B8F69DA34B308477E31F775CCC44158E33FD7DDD51AC87DD33AD80B9B1BF850CEC79A189F011C0689C36C0C91BF6DB9CD65BB7399710E32D9876C00DD44103E54A64A44BF427E1BA4F48DA7AF3D623DBCCF282ED8D4CCAE31B921A9BE92F9E8D7B5C50FBD89D828539CAE3E3493D4F6D7ADA19A876D9DF3801B5C3CFFA6A3C72A246150F307D789BAD6E2408DA5EF05EE805E11C133FFEDFA57CD1C35E49106ADDAC43C51995B9C318066C9ACB4042D8A534370D79F1BAD601';
var expectedVersion = '0.1.0-ravelinjs';

describe('ravelin.encrypt', function() {
  var ravelin = new Ravelin({});

  it('checks its inputs', function() {
    expect(function() { ravelin.encrypt({}); }).to.throwException('[ravelinjs] Encryption Key has not been set');
  });

  it('validates card details exist', function() {
    ravelin.setRSAKey(dummyRSAKey);
    var err = '[ravelinjs] Encryption validation: no details provided';
    expect(function() { ravelin.encrypt(null); }).to.throwException(err);
    expect(function() { ravelin.encrypt(undefined); }).to.throwException(err);
    expect(function() { ravelin.encrypt(false); }).to.throwException(err);
  });

  it('ignores card details exist', function() {
    ravelin.setRSAKey(dummyRSAKey);
    var err = '[ravelinjs] Encryption validation: no details provided';
    expect(function() { ravelin.encrypt(null); }).to.throwException(err);
    expect(function() { ravelin.encrypt(undefined); }).to.throwException(err);
    expect(function() { ravelin.encrypt(false); }).to.throwException(err);
  });

  it('validates pan has at least 12 digits', function() {
    ravelin.setRSAKey(dummyRSAKey);
    var err = '[ravelinjs] Encryption validation: pan should have at least 12 digits';
    expect(function() { ravelin.encrypt({}); }).to.throwException(err);
    expect(function() { ravelin.encrypt({pan: '4111 1111'}); }).to.throwException(err);
  });

  it('validates month is in the range 1-12', function() {
    ravelin.setRSAKey(dummyRSAKey);
    var err = '[ravelinjs] Encryption validation: month should be in the range 1-12';
    expect(function() { ravelin.encrypt({pan: '4111 1111 1111 1111'}); }).to.throwException(err);
    expect(function() { ravelin.encrypt({pan: '4111 1111 1111 1111', month: 0}); }).to.throwException(err);
    expect(function() { ravelin.encrypt({pan: '4111 1111 1111 1111', month: 13}); }).to.throwException(err);
  });

  it('validates year is in the 21st century', function() {
    ravelin.setRSAKey(dummyRSAKey);
    var err = '[ravelinjs] Encryption validation: year should be in the 21st century';
    expect(function() { ravelin.encrypt({pan: '4111 1111 1111 1111', month: 1}); }).to.throwException(err);
    expect(function() { ravelin.encrypt({pan: '4111 1111 1111 1111', month: 1, year: -1}); }).to.throwException(err);
    expect(function() { ravelin.encrypt({pan: '4111 1111 1111 1111', month: 1, year: 'yesteryear'}); }).to.throwException(err);
  });

  it('validates no unknown attributes are present', function() {
    ravelin.setRSAKey(dummyRSAKey);

    var err = '[ravelinjs] Encryption validation: encrypt only allows properties pan, year, month, nameOnCard';
    expect(function() { ravelin.encrypt({pan: '4111 1111 1111 1111', month: 1, year: '18', 'cvv': '123'}); }).to.throwException(err);
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

    for (var i = 0; i < testCases.length; i++) {
      var result = ravelin.encrypt(testCases[i]);
      expect(result).to.satisfy(assertJSONCipher);
    }
  });

  it('can return payload as object', function() {
    ravelin.setRSAKey(dummyRSAKey);

    var result = ravelin.encryptAsObject({
      pan: '4111 1111 1111 1111',
      month: 10,
      year: 2020
    });

    expect(result).to.satisfy(assertCipher);
  });

  it('can parse key index and include in payload', function() {
    ravelin.setRSAKey(dummyRSAKeyWithIndex);
    var result = ravelin.encryptAsObject({
      pan: '4111 1111 1111 1111',
      month: 10,
      year: 2020
    });

    expect(result.keyIndex).to.eq(2);
    expect(result).to.satisfy(assertCipher);
  });

  it('returns unique ciphertexts each call to encrypt', function() {
    ravelin.setRSAKey(dummyRSAKey);
    var input = {
      pan: '4111 1111 1111 1111',
      month: 10,
      year: 2020
    };

    var outputA = ravelin.encryptAsObject(input);
    var outputB = ravelin.encryptAsObject(input);

    expect(outputA).to.satisfy(assertCipher);
    expect(outputB).to.satisfy(assertCipher);
    expect(outputA).not.to.equal(outputB);
  });

  it('does not expose sjcl or RSAKey', function() {
    // jshint -W117
    expect(function() { expect(sjcl); }).to.throwException('sjcl is not defined');
    expect(function() { expect(RSAKey); }).to.throwException('RSAKey is not defined');
    // jshint +W117

    expect(ravelin.sjcl).to.be.undefined;
    expect(ravelin.RSAKey).to.be.undefined;
  });
});
