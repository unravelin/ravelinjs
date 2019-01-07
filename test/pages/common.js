(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TestPageSetup = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {

  // This is the constructor for a helper obj that standardises all the setup code across amd/script/webpack pages.
  // Instantiating this with the ravelinjs instance will instantiate cookies/user agent/ids, register all the
  // onclick listeners, set the public api key etc.
  function TestPageSetup(ravelinjsInstance) {
    wireUpSetterFuncs(ravelinjsInstance);
    wireUpTrackingFuncs(ravelinjsInstance);
    wireUpEncryptionFunc(ravelinjsInstance);

    // The default instantiation for our test files is associated to the CID 'ravelinjs'.
    // Both the RSA key and the public API token are hard coded into this repo (and thus visibile in github).
    // This CID has the private token disabled, and is isolated so that there is no possibility for mischief
    // with these values. The e2e tests will override the RSA key and public API token for their tests.
    setHardCodedRavelinJSTestPubToken();
    setHardCodedRSAKey();

    var custId = 'cust-' + generateRandomString();
    setCustomerId(custId);

    setUserAgent();
    writeCookiesAndIds();
  }

  // Init ravelinjs and the HTML page with a hardcoded public API key associated to the ravelinjs CID
  function setHardCodedRavelinJSTestPubToken() {
    document.getElementById('pubToken').value = 'publishable_key_live_rbe3yd3bpGaCDA9qRxKW9NuuVB1yulNR';
    document.getElementById('setPublicAPIKey').click();
  }

  // Init ravelinjs and the HTML page with a hardcoded public API key associated to the ravelinjs CID
  function setHardCodedRSAKey() {
    var key = '10001|B84498733A4CF477091B6D052129D4B528CB308B30B5567CAAF307608CF2F44D8ADC35191F45BB36A5ACBC191E8EAE6B1F2A80A2EC7F78815179A020246B1D6921EA9CADEE9C16B3FA33EF0183C6F13E3AE35BED0E4A84977B05A32C2C15EA5FEAC6BD594C83C0A226CC1776C26737E9B69E0B183F8F9184ADC44EC5751D1A863BD55E15A148C3B28D649B214890E8D0586AF5E982DB4559156EAA464C712FD7776E8C1C191BA67BA464973F4EB6F8BCEA08FB95EEE09EDAE6F4A8340C7A2833BFE905200488D896A8294A423A59B5058B03F1B82B6CCB6C4746BA297F7BD2D8494B36F02E0EDFF31CDBD73D6FA9BFE958BA58ACEE9CCDC87069C07DB8C6EC63';
    document.getElementById('rsaKey').value = key;
    document.getElementById('setRSAKey').click();
  }

  function setUserAgent() {
    document.getElementById('useragent').appendChild(document.createTextNode(navigator.userAgent));
  }

  function generateRandomString() {
    return Math.random().toString(36).substring(5) + Math.random().toString(36).substring(5);
  }

  function setCustomerId(custId) {
    document.getElementById('customerId').value = custId;
    document.getElementById('setCustomerId').click();
  }

  function writeCookiesAndIds() {
    var cookiesElem = document.getElementById('cookies');
    if (cookiesElem.innerHTML == '') {
      cookiesElem.appendChild(document.createTextNode(document.cookie));
    }

    var cookies = document.cookie.split('; ');
    for (var i = cookies.length-1; i >= 0; i--) {
      var x = cookies[i].split('=');
      var cookieName = x[0];
      var cookieVal = x[1];

      if (cookieName === 'ravelinDeviceId') {
        var devIdElem = document.getElementById('deviceId');
        if (devIdElem.innerHTML == '') {
          devIdElem.appendChild(document.createTextNode(cookieVal));
        }
      } else if (cookieName === 'ravelinSessionId') {
        var sesIdElem = document.getElementById('sessionId');
        if (sesIdElem.innerHTML == '') {
          sesIdElem.appendChild(document.createTextNode(cookieVal));
        }
      }
    };
  }

  // Wire up 'setter' buttons that set keys, tokens ids etc to associated rjs buttons
  function wireUpSetterFuncs(rjsInstance) {
    var setRSAKey = function() { rjsInstance.setRSAKey(document.getElementById('rsaKey').value); };
    var setPublicAPIKey = function() { rjsInstance.setPublicAPIKey(document.getElementById('pubToken').value); };
    var setCustomerId = function() {rjsInstance.setCustomerId(document.getElementById('customerId').value); };
    var setTempCustomerId = function() {rjsInstance.setTempCustomerId(document.getElementById('tempCustomerId').value); };
    var setOrderId = function() { rjsInstance.setOrderId(document.getElementById('orderId').value); };

    document.getElementById('setRSAKey').onclick = setRSAKey;
    document.getElementById('setPublicAPIKey').onclick = setPublicAPIKey;
    document.getElementById('setCustomerId').onclick = setCustomerId;
    document.getElementById('setTempCustomerId').onclick = setTempCustomerId;
    document.getElementById('setOrderId').onclick = setOrderId;
  }

  function wireUpTrackingFuncs(rjsInstance) {
    var trackFingerprint = function() { rjsInstance.trackFingerprint(null, writeFingerprintError); };
    var trackPage = trackWithErrHandlingCallback(rjsInstance, rjsInstance.trackPage, [null]);
    var track = trackWithErrHandlingCallback(rjsInstance, rjsInstance.track, ['RANDOM', { rand: generateRandomString() }]);

    var trackLogout = trackWithErrHandlingCallback(rjsInstance, rjsInstance.trackLogout, [null]);

    document.getElementById('trackFingerprint').onclick = trackFingerprint;
    document.getElementById('track').onclick = track;
    document.getElementById('trackPage').onclick = trackPage;
    document.getElementById('trackLogout').onclick = trackLogout;

    // We don't have trackLogin yet
    // document.getElementById('trackLogin').onclick = trackLogin;
    // var trackLogin = trackWithErrHandlingCallback(rjsInstance, rjsInstance.trackLogin, [null, null]);
  }

  function wireUpEncryptionFunc(rjsInstance) {
    document.getElementById('encrypt').onclick = function() {
      var month = document.getElementById('month');
      writeEncryptionOutput(function() {
        return rjsInstance.encrypt({
          nameOnCard: document.getElementById('name').value,
          pan: document.getElementById('number').value,
          month: month.options[month.selectedIndex].value,
          year: document.getElementById('year').value,
        });
      });
    };
  }

  function writeFingerprintError(err) {
    writeCookiesAndIds(); // Temporary measure as we haven't yet ported deviceId setting into ravelinjs
    document.getElementById('fingerprintError').innerText = err instanceof Error ? err.message : '';
  }

  // Create a wrapper func that calls a given session-tracking function, along with the provided
  // params, but also includes a callback that writes any received errors back to the page.
  // This is useful for asserting that our tracking funcs aren't erroring.
  function trackWithErrHandlingCallback(rjsInstance, trackFunc, params) {
    params = params ? params : [];
    params.push(function(err) {
      document.getElementById('trackingError').innerText = err ? err.message : '';
    });

    return function () { trackFunc.apply(rjsInstance, params); };
  }

  function writeEncryptionOutput(action) {
    // Reset the output
    var stdout = document.getElementById('encryptionOutput');
    var stderr = document.getElementById('encryptionOutputError');
    stdout.innerHTML = stderr.innerHTML = '';

    // Collect the output
    var output, error;
    try {
      output = action();
    } catch (e) {
      error = e;
    }

    // Show the output
    if (output) stdout.appendChild(document.createTextNode(output));
    if (error) stderr.appendChild(document.createTextNode(error));
  }

  return TestPageSetup;
}));
