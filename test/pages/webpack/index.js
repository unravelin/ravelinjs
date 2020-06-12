import ravelin from '../../../ravelin.js';
import output from '../common.js';

output(function() {
  ravelin.setPublicAPIKey('secret_key_test_mWDl1lMj0TRwoD2w3VtP4iAPi9X3tedv');
  ravelin.trackFingerprint('paul');
  ravelin.trackPage();
  return 'Cookies: ' + document.cookie;
});

ravelin.setRSAKey('10001|BB2D2D2FD3812FEBECF8955843228A0E1952342583DFC02B8393475C414E16FDCBE8753BD63C164104785D8A67E344D495B5C0C622CE8D643F3191BC6BE0D3050F391F77E1D7E1B8F69DA34B308477E31F775CCC44158E33FD7DDD51AC87DD33AD80B9B1BF850CEC79A189F011C0689C36C0C91BF6DB9CD65BB7399710E32D9876C00DD44103E54A64A44BF427E1BA4F48DA7AF3D623DBCCF282ED8D4CCAE31B921A9BE92F9E8D7B5C50FBD89D828539CAE3E3493D4F6D7ADA19A876D9DF3801B5C3CFFA6A3C72A246150F307D789BAD6E2408DA5EF05EE805E11C133FFEDFA57CD1C35E49106ADDAC43C51995B9C318066C9ACB4042D8A534370D79F1BAD601');
document.getElementById('form').onsubmit = function() {
    var month = document.getElementById('month');
    output(function() {
        return ravelin.encrypt({
            nameOnCard: document.getElementById('name').value,
            pan: document.getElementById('number').value,
            month: month.options[month.selectedIndex].value,
            year: document.getElementById('year').value,
        });
    });
    return false;
};
