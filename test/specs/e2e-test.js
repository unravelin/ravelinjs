describe('ravelinjs returns the encrypted card details', function() {
    const rsaKey = process.env.E2E_RSA_KEY;
    const nameOnCard = process.env.E2E_NAME_ON_CARD;
    const outputFilepath = process.env.E2E_CIPHERTEXT_FILE;
    console.log('Name on card:', nameOnCard);
    console.log('Ciphertext destination:', outputFilepath);
    console.log('RSA Key:', rsaKey);
    if (!rsaKey.match(/^[^|]+\|[^|]+$/)) throw new Error("Envvar E2E_RSA_KEY must be set and of the form ...|...");
    if (!nameOnCard) throw new Error("Envvar E2E_NAME_ON_CARD must be set.");
    if (!outputFilepath) throw new Error("Envvar E2E_CIPHERTEXT_FILE must be set.");

    it('loads the page', function() {
        browser.url('/pages/scripttag/index.html');
    });

    it('sets up the RSA key', function() {
      browser.setValue('#rsaKey', rsaKey);
      browser.click('#setRSAKey');
    });

    var ciphertext;

    it('encrypts the cardholder data', function() {
        // Encrypt the card data.
        browser.setValue('#name', nameOnCard);
        browser.setValue('#number', '4111 1111 1111 1111');
        browser.selectByValue('#month', '4')
        browser.setValue('#year', '2019');
        browser.click('#encrypt');

        // Check there wasn't an error.
        raise(browser.getText('#encryptionOutputError'));

        ciphertext = browser.getText('#encryptionOutput');
        if (!ciphertext.match(/^\{.+\}$/) || !ciphertext.includes("cardCiphertext")) {
          throw new Error("Doesn't look like we got a valid ciphertext: " + ciphertext);
        }
    });

    it('writes the cipher to a local file', function() {
        require('fs').writeFileSync(outputFilepath, ciphertext || '');
    });
});

function raise(err) {
    if (err) throw new Error(err);
}
