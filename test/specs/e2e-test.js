describe('ravelinjs returns the encrypted card details', function() {
    const rsaKey = process.env.E2E_RSA_KEY;
    const nameOnCard = process.env.E2E_NAME_ON_CARD;
    const outputFilepath = process.env.E2E_CIPHERTEXT_FILE;
    console.log('Name on card:', nameOnCard);
    console.log('Ciphertext destination:', outputFilepath);
    console.log('RSA Key:', rsaKey);
    if (!rsaKey) throw new Error("Envvar E2E_RSA_KEY must be set.");
    if (!nameOnCard) throw new Error("Envvar E2E_NAME_ON_CARD must be set.");
    if (!outputFilepath) throw new Error("Envvar E2E_CIPHERTEXT_FILE must be set.");
    if (!rsaKey.match(/^[^|]+\|[^|]+$/)) throw new Error("Envvar E2E_RSA_KEY must be of the form ...|...");

    it('loads the page', function() {
        browser.url('/pages/scripttag/index.html');
    });

    it('sets up the RSA key', function() {
        // Wait for the page to load.
        $('#name').waitForExist();

        // Set the key.
        const demoKeyMsg = browser.getText('#output');
        browser.setValue('#rsa-key', rsaKey);
        browser.click('#key-form input[type=submit]');

        // Check there wasn't an error.
        raise(browser.getText('#output-error'));

        // Confirm the key has been updated.
        const output = browser.getText('#output');
        if (output == demoKeyMsg) {
            throw new Error('Key wasnt changed from default');
        } else if (!output.match(/^Key set/)) {
            throw new Error('Output message doesnt suggest key was set');
        }
    });

    var ciphertext;

    it('encrypts the cardholder data', function() {
        // Wait for the page to load.
        $('#name').waitForExist();

        // Encrypt the card data.
        browser.setValue('#name', nameOnCard);
        browser.setValue('#number', '4111 1111 1111 1111');
        browser.selectByValue('#month', '4')
        browser.setValue('#year', '2019');
        browser.click('#update');

        // Check there wasn't an error.
        raise(browser.getText('#output-error'));

        ciphertext = browser.getText('#output');
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
