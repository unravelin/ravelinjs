import ravelin from '../../../ravelin.js';
import output from '../common.js';

document.getElementById('encrypt').onclick = function() {
  var month = document.getElementById('month');
  output('encryption-output', function() {
    return ravelin.encrypt({
      nameOnCard: document.getElementById('name').value,
      pan: document.getElementById('number').value,
      month: month.options[month.selectedIndex].value,
      year: document.getElementById('year').value
    });
  });
  return false;
};

var setRSAKey = function() { ravelin.setRSAKey(document.getElementById('rsa-key').value); };
var setPublicAPIKey = function() { ravelin.setPublicAPIKey(document.getElementById('pub-token').value); };
var setCustomerId = function() { ravelin.setCustomerId(document.getElementById('customer-id').value); };
var setTempCustomerId = function() { ravelin.setTempCustomerId(document.getElementById('temp-customer-id').value); };
var setOrderId = function() { ravelin.setOrderId(document.getElementById('order-id').value); };

var trackFingerprint = function() { ravelin.trackFingerprint(); };
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
