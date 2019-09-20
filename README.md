# ravelinjs

`ravelinjs` is used to gather fraud prevention data points from customer sessions. This primarily consists of:
    - device identifiers
    - device information
    - session information
    - encrypted card details

## Usage Guide

### Loading the Library

The ravelin library can be used as a dependency in AMD modules; imported into
scripts bundled using webpack; or by dropping a `<script src="ravelin.min.js">`
into your web page.

### Instantiation
The first thing you will need to do once the page has loaded is to initialise the state of the instance:
```
ravelinjs.setPublicAPIKey('pk_live_...'); // your public API key is available from the Ravelin dashboard

ravelinjs.setCustomerId('cust123'); // if the customerId is currently known, you can set it...
ravelinjs.setTempCustomerId('session_abc123...'); // ...else, do you have a temporary customerId you can use?
ravelinjs.setOrderId('order123'); // if the orderId is currently known, you can set it

ravelinjs.setPublicRSAKey('10001|BB2...'); // if using client-side encryption, you must also set the public RSA key

```
### Assigning DeviceIds (Required)

On instantiation, ravelinjs will set a `ravelinDeviceId` cookie in the browser. This value will either be a previously assigned deviceId (from a previous session), or a newly generated UUID unique if no prior value was detected. Extract this cookie from requests to your servers to include it in future Ravelin API requests.

### Encrypting Cards (Optional)

If you wish to use our [client-side encryption](https://developer.ravelin.com/guides/pci/#submission-of-encrypted-card-details) offering, you can encrypt the values to send to Ravelin using
`ravelinjs.encrypt({pan, month, year, nameOnCard})`.

`pan`, `month`, `year` are required, whilst `nameOnCard` is optional, and no other properties are allowed
on the object. Validation is performed on the length of the PAN and expiry dates; failures cause an
exception to be raised.

### Tracking Page Activity

The `track`, and
`trackPage` (call on page load) methods can be used instead of the [device
fingerprinting snippet][device-track]. See the example below for more.

## Example

In the following form, we collect card details from the customer, encrypt them
and send that encrypted value (the cipher) back to your server.

```html
<!-- Browser -->
<form id="form-payment-card">
    Card Number: <input name="pan" />
    CVV: <input name="cvv" />
    Name: <input name="nameOnCard" />
    Month: <input name="month" />
    Year: <input name="year" />
    <input type="hidden" name="ravelinCipherText" />
    <input type="submit" />
</form>

<script src="ravelin.min.js"></script>
<script>
    // Tracking.
    ravelinjs.setPublicAPIKey('pk_live_...');
    ravelinjs.trackPage();

    // Encryption.
    ravelinjs.setRSAKey('..|.....')
    document.getElementById('form-payment-card').onsubmit = function() {
        // When the #form-payment-card is submitted, we set the value of the
        // <input type="hidden" name="ravelinCipherText" /> is set to the
        // encrypted value returned by the ravelin library. This value is sent
        // along with your form to your server. You can then forward this value
        // to Ravelin in your server-side API call.
        this.ravelinCipherText.value = ravelinjs.encrypt({
            pan: this.pan.value,
            month: this.month.value,
            year: this.year.value,
            nameOnCard: this.nameOnCard.value,
        });

        // TODO Save the card elsewhere. Might be a PSP API call.
        // Might be some more encryption to be sent to your server too.
        saveCardElsewhere(...);

        // Avoid sending sensitive data to your server.
        this.pan.value = this.cvv.value = this.name.value = '';
    };
</script>
```

Once the cipher value is received by your server, it should be used in the API request to Ravelin to obtain a
fraud recommendation:

```js
/* Server-side */

var card = JSON.parse(form.getValue('ravelinCipherText'));
card.methodType = 'paymentMethodCipher';

var action = request('https://api.ravelin.com/v2/checkout?score=true', {
    // ...
    'paymentMethod': card,
});
```

## Browser Support

Ravelin tests this library using [many browsers](test/crossbrowser.conf.js). Older browser support is
provided, but there are caveats on IE10 and other older browsers who do not implement any `window.crypto`-like
API. In these cases, entropy is collected from user activity on the browser. In cases where insufficient
entropy is collected before `encrypt` is called, an exception is thrown. This API will be tidied up in future.

## Bundled Code

This library would not have been possible without the stellar works upon which it relies:

* http://bitwiseshiftleft.github.io/sjcl/ (MIT)
* http://www-cs-students.stanford.edu/~tjw/jsbn/ (BSD)
