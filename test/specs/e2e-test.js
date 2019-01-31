// e2e tests are triggered from inside the Ravelin 'integration-test-service' microservice.
// They test that the values generated/submitted from the ravelinjs library behave as expected when sent
// to the Ravelin API. We achieve this by calling ravelinjs functions, writing their outputs to dedicated
// text files (persisted as 'Artifacts' to the build in CircleCI) and then making assertions against their
// values from inside the integration-test-service.
describe('ravelinjs', function() {

  // We have hardcoded the file names of our outputs because they must be individually specified as
  // 'store_artifacts' commands in circle.yml. These files will be written to the root dir of the repo,
  // and available at the path 'home/circleci/repo/$.txt' via the API.
  const ciphertextOutputFile = './cipher.txt';
  const deviceIdFile = './deviceid.txt';
  const sessionIdFile = './sessionid.txt';

  // When the integration test is launched, some env variables are also set, some of which are unique per run.
  // These must also all be provided in order to complete this test suite. See the RavelinJS integration test
  // to see how these values are generated and how they are provided to the job.
  const publicApiToken = process.env.E2E_PUBLIC_API_TOKEN;
  const rsaKey = process.env.E2E_RSA_KEY;
  const nameOnCard = process.env.E2E_NAME_ON_CARD;
  const customerId = process.env.E2E_CUSTOMER_ID;
  const orderId = process.env.E2E_ORDER_ID;

  if (!publicApiToken || !publicApiToken.match(/(publishable_key_live_)([0-z]+)/)) {
    throw new Error("Envvar E2E_PUBLIC_API_TOKEN must be set and of the form publishable_key_live_XXXXXXXX");
  }

  if (!rsaKey || !rsaKey.match(/^[^|]+\|[^|]+$/)) {
    throw new Error("Envvar E2E_RSA_KEY must be set and of the form ...|...");
  }

  if (!nameOnCard) throw new Error("Envvar E2E_NAME_ON_CARD must be set.");
  if (!customerId) throw new Error("Envvar E2E_CUSTOMER_ID must be set.");
  if (!orderId) throw new Error("Envvar E2E_ORDER_ID must be set.");

  console.log('Publishable Token:', publicApiToken);
  console.log('RSA Key:', rsaKey);
  console.log('Name on card:', nameOnCard);
  console.log('CustomerId:', customerId);
  console.log('OrderId:', orderId);

  it('loads the page', function() {
    browser.url('/pages/scripttag/index.html');

    // We want to run this e2e test from our staging environment, so we need to hack the XHR 'open' function
    // to manipulate the URL passed in. We want to add '-staging' to the hardcoded https://api.ravelin.com url.
    // We do this by passing some Javascript to be executed in the context of our browser.
    browser.execute(function() {
      var baseImp = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function() {
        arguments[1] = arguments[1].replace('.', '-staging.', 1);
        return baseImp.apply(this, arguments);
      };
    });

    browser.pause(1000); // Wait for commonjs init to complete

    browser.setValue('#pubToken', publicApiToken);
    browser.click('#setPublicAPIKey');

    browser.setValue('#rsaKey', rsaKey);
    browser.click('#setRSAKey');

    browser.setValue('#customerId', customerId);
    browser.click('#setCustomerId');

    browser.setValue('#customerId', customerId);
    browser.click('#setCustomerId');

    browser.setValue('#orderId', orderId);
    browser.click('#setOrderId');
  });

  // Our first test populates the card encryption form, saves the ciphertext and submits the paymentMethodCipher
  // for decryption, verifying that the card details saved against the customer match the encrypted inputs.
  describe('returns the encrypted card details', function() {
    var ciphertext;

    it('encrypts the cardholder data', function() {
      // Encrypt the card data.
      browser.setValue('#name', nameOnCard);
      browser.setValue('#number', '4111 1111 1111 1111');
      browser.selectByValue('#month', '4');
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
    it('fingerprints the device and submits details + deviceId to Ravelin', function() {
      browser.click('#trackFingerprint');
    });

    it('writes the deviceId artifact', function() {
      require('fs').writeFileSync(deviceIdFile, browser.getText('#deviceId') || '');
    });
  });

  // Our final test triggers a track event for the 'vanilla', 'page', 'login' and 'logout' events.
  // Using the same customerId and orderId, we will verify each of these 4 events are recorded against this
  // session in Ravelin.
  describe('ravelinjs tracks session activity', function() {
    it('tracks session events', function() {
      browser.click('#track');
      browser.click('#trackPage');
      browser.click('#trackLogin');
      browser.click('#trackLogout');
    });

    it('writes the sessionId artifact', function() {
      require('fs').writeFileSync(sessionIdFile, browser.getText('#sessionId') || '');
    });
  });
});

function raise(err) {
  if (err) throw new Error(err);
}
