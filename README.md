# ravelinjs

`ravelinjs` is used to gather fraud prevention data points from customer sessions. This primarily consists of:
- device identifiers
- device information
- session information
- encrypted card details

Gathering these values accurately, and ensuring they are made available to Ravelin through our API or by calls made directly from this SDK, is critical to a successful Ravelin integration.

## Usage Guide

### Loading the Library

The library can be used as a dependency in AMD modules; imported into scripts bundled using webpack;
or by dropping a `<script src="ravelin.min.js">` into your web page.

### Instantiation (Required)
Once the page has loaded, you need to initialise the state of the instance:
```
ravelinjs.setPublicAPIKey('pk_live_...'); // your public API key is available from the Ravelin dashboard

ravelinjs.setCustomerId('cust123'); // if the customerId is currently known, you can set it...
ravelinjs.setTempCustomerId('session_abc123...'); // ...else, do you have a temporary customerId you can use?
ravelinjs.setOrderId('order123'); // if the orderId is currently known, you can set it

ravelinjs.setPublicRSAKey('10001|BB2...'); // if using client-side encryption, you must also set the public RSA key
```

### Assigning DeviceIds (Required)
On instantiation, ravelinjs will ensure a `ravelinDeviceId` cookie is set in the customer's browser. This
value will either be a previously assigned deviceId (from a previous session), or a newly generated UUID (if
no prior value was detected). Extract this cookie from requests to your servers to include it in future
Ravelin API requests.

### Extracting Device Information (Recommended)
To send details of the customer's device to Ravelin, use the `trackFingerprint` method.

```html
<script src="ravelin.min.js"></script>
<script>
    ravelinjs.setPublicAPIKey('pk_live_...');
    ravelinjs.trackFingerprint();
</script>
```

### Tracking Page Activity (Recommended)
The `track`, and `trackPage` methods are used to send session activity information directly to Ravelin.

```html
<script src="ravelin.min.js"></script>
<script>
    ravelinjs.setPublicAPIKey('pk_live_...');
    ravelinjs.trackPage();
</script>
```

### Encrypting Cards (Optional)
If you wish to use our [client-side
encryption](https://developer.ravelin.com/guides/pci/#submission-of-encrypted-card-details) offering, you can
encrypt the values to send to Ravelin using `ravelinjs.encrypt({pan, month, year, nameOnCard})`.

`pan`, `month`, `year` are required, whilst `nameOnCard` is optional, and no other properties are allowed on
the object. Validation is performed on the length of the PAN and expiry dates; failures cause an exception to
be raised.

Encrypting card details is only necessary for PCI SAQ-A or SAQ-AEP merchants who are otherwise unable to
provide card details (including a valid [`instrumentId`](https://developer.ravelin.com/apis/v2/#checkout.paymentMethod.0.instrumentId)) to Ravelin during the pre-transaction stage or the
payment flow.

#### Example
In the following form, we collect card details from the customer, encrypt them and send that encrypted value
(the cipher) back to your server.

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
