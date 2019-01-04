// e2e tests are triggered from inside the Ravelin 'integration-test-service' microservice.
// They test that the values generated/submitted from the ravelinjs library behave as expected when sent
// to the Ravelin API. We achieve this by calling ravelinjs functions, writing their outputs to dedicated
// text files (persisted as 'Artifacts' to the build in CircleCI) and then making assertions against their
// values from inside the integration-test-service.
describe('ravelinjs', function() {

  // Our first test populates the card encryption form, saves the ciphertext and submits the paymentMethodCipher
  // for decryption, verifying that the card details saved against the customer match the encrypted inputs.
  describe('returns the encrypted card details', function() {
    const rsaKey = process.env.E2E_RSA_KEY;
    const nameOnCard = process.env.E2E_NAME_ON_CARD;
    const ciphertextOutputFile = process.env.E2E_CIPHERTEXT_FILE;

    console.log('Name on card:', nameOnCard);
    console.log('Ciphertext destination:', ciphertextOutputFile);
    console.log('RSA Key:', rsaKey);

    if (!rsaKey.match(/^[^|]+\|[^|]+$/)) throw new Error("Envvar E2E_RSA_KEY must be set and of the form ...|...");
    if (!nameOnCard) throw new Error("Envvar E2E_NAME_ON_CARD must be set.");
    if (!ciphertextOutputFile) throw new Error("Envvar E2E_CIPHERTEXT_FILE must be set.");

    it('loads the page', function() {
      browser.url('/pages/scripttag/index.html');

      browser.pause(1000); // Wait for commonjs init to complete

      browser.setValue('#rsaKey', rsaKey);
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
      require('fs').writeFileSync(ciphertextOutputFile, ciphertext || '');
    });
  });

  // Our second test submits a device fingerprint to the API under a random customerId. Using that same
  // customerId, we read out their devices and assert that a device with our ravelinjs deviceId exists.
  describe('ravelinjs tracks and fingerprints the browser', function() {
    const publicApiToken = process.env.E2E_PUBLIC_API_TOKEN;
    const customerId = process.env.E2E_CUSTOMER_ID;
    const fingerprintTestOutputFile = process.env.E2E_FINGERPRINT_TEST_OUTPUT_FILE;

    console.log('Publishable Token:', publicApiToken);
    console.log('CustomerId:', customerId);
    console.log('Fingerprint destination:', fingerprintTestOutputFile);

    if (!customerId) throw new Error("Envvar E2E_CUSTOMER_ID must be set.");
    if (!fingerprintTestOutputFile) throw new Error("Envvar E2E_FINGERPRINT_TEST_OUTPUT_FILE must be set.");

    it('loads the page', function() {
      browser.url('/pages/scripttag/index.html');

      browser.pause(1000); // Wait for commonjs init to complete

      browser.setValue('#pubToken', publicApiToken);
      browser.click('#setPublicAPIKey');

      browser.setValue('#customerId', customerId);
      browser.click('#setCustomerId');
    });

    it('fingerprints the device and submits details + deviceId to Ravelin', function() {
      browser.click('#trackFingerprint');

      browser.pause(1000); // Wait for async request to complete

      var error = browser.getText('#fingerprintError');
      if (error) throw new Error(error);
    });

    it('writes the deviceId and sessionId to a local file', function() {
      var deviceId = browser.getText('#deviceId');
      var sessionId = browser.getText('#sessionId');
      require('fs').writeFileSync(fingerprintTestOutputFile, deviceId+'|'+sessionId);
    });
  });

  // Our final test triggers a track event for the 'vanilla', 'page', 'login' and 'logout' events.
  // Using the same customerId and orderId, we will verify each of these 4 events are recorded against this
  // session in Ravelin.
  describe('ravelinjs tracks session activity', function() {
    const publicApiToken = process.env.E2E_PUBLIC_API_TOKEN;
    const customerId = process.env.E2E_CUSTOMER_ID;
    const orderId = process.env.E2E_ORDER_ID;
    const sessionTrackingTestOutputFile = process.env.E2E_SESSION_TRACKING_TEST_OUTPUT_FILE;

    console.log('Publishable Token:', publicApiToken);
    console.log('CustomerId:', customerId);
    console.log('OrderId:', orderId);
    console.log('Session Tracking destination:', sessionTrackingTestOutputFile);

    if (!customerId) throw new Error("Envvar E2E_CUSTOMER_ID must be set.");
    if (!orderId) throw new Error("Envvar E2E_ORDER_ID must be set.");
    if (!sessionTrackingTestOutputFile) throw new Error("Envvar E2E_SESSION_TRACKING_TEST_OUTPUT_FILE must be set.");

    it('loads the page', function() {
      browser.url('/pages/scripttag/index.html');

      browser.pause(1000); // Wait for commonjs init to complete

      browser.setValue('#pubToken', publicApiToken);
      browser.click('#setPublicAPIKey');

      browser.setValue('#customerId', customerId);
      browser.click('#setCustomerId');

      browser.setValue('#orderId', orderId);
      browser.click('#setOrderId');
    });

    it('tracks custom events', function() {
      browser.click('#track');

      browser.pause(1000); // Wait for async request to complete

      var error = browser.getText('#trackingError');
      if (error) throw new Error(error);
    });

    it('tracks page load', function() {
      browser.click('#trackPage');

      browser.pause(1000); // Wait for async request to complete

      var error = browser.getText('#trackingError');
      if (error) throw new Error(error);
    });

    it('tracks login', function() {
      browser.click('#trackLogin');

      browser.pause(1000); // Wait for async request to complete

      var error = browser.getText('#trackingError');
      if (error) throw new Error(error);
    });

    it('tracks logout', function() {
      browser.click('#trackLogout');

      browser.pause(1000); // Wait for async request to complete

      var error = browser.getText('#trackingError');
      if (error) throw new Error(error);
    });

    it('writes the deviceId and sessionId to a local file', function() {
      var deviceId = browser.getText('#deviceId');
      var sessionId = browser.getText('#sessionId');
      require('fs').writeFileSync(sessionTrackingTestOutputFile, deviceId+'|'+sessionId);
    });
  });
});

function raise(err) {
  if (err) throw new Error(err);
}
