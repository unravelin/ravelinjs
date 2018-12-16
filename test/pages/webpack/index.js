import ravelin from '../../../ravelin.js';
import output from '../common.js';

document.getElementById('encrypt').onclick = function() {
  var month = document.getElementById('month');
  output('encryption-output', function() {
    return ravelin.encrypt({
      nameOnCard: document.getElementById('name').value,
      pan: document.getElementById('number').value,
      month: month.options[month.selectedIndex].value,
      year: document.getElementById('year').value,
    });
  });
  return false;
};

var setRSAKey = () => ravelin.setRSAKey(document.getElementById('rsa-key').value);
var setPublicAPIKey = () => ravelin.setPublicAPIKey(document.getElementById('pub-token').value);
var setCustomerId = () => ravelin.setCustomerId(document.getElementById('customer-id').value);
var setTempCustomerId = () => ravelin.setTempCustomerId(document.getElementById('temp-customer-id').value);
var setOrderId = () => ravelin.setOrderId(document.getElementById('order-id').value);

var trackFingerprint = () => ravelin.trackFingerprint();
var track = () => ravelin.track('RANDOM', { rand: ravelin.uuid() });
var trackPage = () => ravelin.trackPage();
var trackLogin = () => ravelin.trackLogin();
var trackLogout = () => ravelin.trackLogout();

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
