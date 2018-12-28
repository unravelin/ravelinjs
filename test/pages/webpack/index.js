import ravelin from '../../../ravelin.js';
import output from '../common.js';

document.getElementById('encrypt').onclick = function() {
  var month = document.getElementById('month');
  output('encryptionOutput', function() {
    return ravelin.encrypt({
      nameOnCard: document.getElementById('name').value,
      pan: document.getElementById('number').value,
      month: month.options[month.selectedIndex].value,
      year: document.getElementById('year').value
    });
  });
  return false;
};

var setRSAKey = function() { ravelin.setRSAKey(document.getElementById('rsaKey').value); };
var setPublicAPIKey = function() { ravelin.setPublicAPIKey(document.getElementById('pubToken').value); };
var setCustomerId = function() { ravelin.setCustomerId(document.getElementById('customerId').value); };
var setTempCustomerId = function() { ravelin.setTempCustomerId(document.getElementById('tempCustomerId').value); };
var setOrderId = function() { ravelin.setOrderId(document.getElementById('orderId').value); };

var trackFingerprint = function() {
  ravelinjs.trackFingerprint(null, function(err) {
      document.getElementById('fingerprintError').innerText = err ? err.message : '';
  });
};

var track = function() { ravelin.track('RANDOM', { rand: ravelin.uuid() }); };
var trackPage = function() { ravelin.trackPage(); };
var trackLogin = function() { ravelin.trackLogin(); };
var trackLogout = function() { ravelin.trackLogout(); };

document.getElementById('setRSAKey').onclick = setRSAKey;
document.getElementById('setPublicAPIKey').onclick = setPublicAPIKey;
document.getElementById('setCustomerId').onclick = setCustomerId;
document.getElementById('setTempCustomerId').onclick = setTempCustomerId;
document.getElementById('setOrderId').onclick = setOrderId;

document.getElementById('trackFingerprint').onclick = trackFingerprint;
document.getElementById('track').onclick = track;
document.getElementById('trackPage').onclick = trackPage;
document.getElementById('trackLogin').onclick = trackLogin;
document.getElementById('trackLogout').onclick = trackLogout;

setPublicAPIKey();
setRSAKey();
