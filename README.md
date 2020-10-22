# ravelinjs

ravelinjs is a JavaScript library for the browser to augment your integration
with:

* an identifier for the customer's browser to be attached to an order (core);
* simple page events like loading, pasting and resizing (track); and
* credit card details encrypted for transmission through your server (encrypt).

Gathering these values accurately, and ensuring they are made available to
Ravelin through our API or by calls made directly from this SDK, is critical to
a successful Ravelin integration.

---

## Quickstart

Get a copy of [ravelin-core+track+encrypt+promise.min.js on Github
releases](https://www.github.com/unravelin/ravelinjs/releases/) and instantiate
your Ravelin instance on the page:

```html
<script src="ravelin-core+track+encrypt+promise.min.js"></script>
<script>var ravelin = new Ravelin({key: 'publishable_key_...'})</script>
```

This will set the `ravelinDeviceId` cookie on your domain, send a page-load
event, and then allow you to call:

* `ravelin.core.id().then(function(id) { ... })` to get the deviceId.
* `ravelin.encrypt.card({pan: "4111 ..."})` to encrypt card details to be sent
  to Ravelin.
* `ravelin.track.load()` to track a page load.

→ Read on for more details.

---

## Bundles

The quickstart suggests using `ravelin-core+track+encrypt+promise.min.js` which
contains all functionality offered by ravelinjs and is therefore the easiest to
get started with but also the largest file. If you are not using all of the
functionality of ravelinjs you can choose a bundle with only the components you need.

The components are:

* **core:** API and error-reporting functionality used by all bundles, and Basic
  device identification:
    * `ravelinDeviceId` cookie
    * `ravelin.core.id()`
* **track:** Send page-load, resize and paste events:
    * `ravelin.track.load()`
    * `ravelin.track.paste()`
    * `ravelin.track.resize()`
* **encrypt:** Card encryption.
    * `ravelin.encrypt.card()`
* **promise:** A Promise polyfill required for Internet Explorer support.
  Optional if you already have your own polyfill or do not want to support any
  version of Internet Explorer.

The [release files](https://github.com/unravelin/ravelinjs/releases) indicate
which components they include using a `+component` naming convention. For
example, `ravelin-core+track.min.js` contains only the core and track components
and so cannot be used to encrypt cards and doesn't guarantee Internet Explorer
compatibility.

## Browser Compatibility

RavelinJS v1.0.0 is [tested on IE8-11 and all newer
browsers](test/wdio.conf.js). A Promise/A+ polyfill is required for Internet
Explorer support. If you do not have one, or at not sure, then use a +promise
ravelinjs bundle.

We plan to drop support for IE8-IE10 soon, so please contact us if you still
support these browsers.

## Loading the library

The bundle files can be used by dropping a `<script src="ravelin.min.js">` into
your web page, as a dependency in AMD modules, or imported into scripts bundled
using webpack.

## Setup

During your page load you need to instantiate a `Ravelin` instance:

```javascript
var ravelin = new Ravelin({
    /**
     * @prop {string} key The publishable key used to authenticate with the API.
     */
    key: 'publishable_key_...',
    /**
     * @prop {string} [api] The base URL of the Ravelin API. Defaults to
     * productive, or another environment identified by the key.
     */
    // api: 'https://api/',
    /**
     * @prop {string} [cookieDomain] The top-most domain that we can store
     * cookies on. If you expect your customer to navigate between multiple
     * subdomains, e.g. catalog.store.com, checkout.store.com, then set
     * cookieDomain to store.com.
     */
    // cookieDomain: 'store.com',

    // Encrypt
    // =======
    /**
     * @prop {string} [rsaKey] The public key used to encrypt credit card info.
     */
    // rsaKey: '0|...',
});
```

## Attach Devices to Customers and Orders

The first task from

## Assigning DeviceIds (Required)
On instantiation, ravelinjs will ensure a `ravelinDeviceId` cookie is set in the customer's browser. This
value will either be a previously assigned deviceId (from a previous session), or a newly generated UUID (if
no prior value was detected). Extract this cookie from requests to your servers to include it in future
Ravelin API requests.

## Extracting Device Information (Recommended)
To send details of the customer's device to Ravelin, use the `trackFingerprint` method.

```html
<script src="ravelin.min.js"></script>
<script>
    ravelinjs.setPublicAPIKey('pk_live_...');
    ravelinjs.trackFingerprint();
</script>
```

## Tracking Page Activity (Recommended)
The `track`, and `trackPage` methods are used to send session activity information directly to Ravelin.

```html
<script src="ravelin.min.js"></script>
<script>
    ravelinjs.setPublicAPIKey('pk_live_...');
    ravelinjs.trackPage();
</script>
```

## Encrypting Cards (Optional)
If you wish to use our [client-side
encryption](https://developer.ravelin.com/guides/pci/#submission-of-encrypted-card-details) offering, you can
encrypt the values to send to Ravelin using `ravelinjs.encrypt({pan, month, year, nameOnCard})`.

`pan`, `month`, `year` are required, whilst `nameOnCard` is optional, and no other properties are allowed on
the object. Validation is performed on the length of the PAN and expiry dates; failures cause an exception to
be raised.

Encrypting card details is only necessary for PCI SAQ-A or SAQ-AEP merchants who are otherwise unable to
provide card details (including a valid [`instrumentId`](https://developer.ravelin.com/apis/v2/#checkout.paymentMethod.0.instrumentId)) to Ravelin during the pre-transaction stage or the
payment flow.

### Example
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

# Browser Support

Ravelin tests this library using [many browsers](test/crossbrowser.conf.js). Older browser support is
provided, but there are caveats on IE10 and other older browsers who do not implement any `window.crypto`-like
API. In these cases, entropy is collected from user activity on the browser. In cases where insufficient
entropy is collected before `encrypt` is called, an exception is thrown. This API will be tidied up in future.

# Bundled Code

This library would not have been possible without the stellar works upon which it relies:

* http://bitwiseshiftleft.github.io/sjcl/ (MIT)
* http://www-cs-students.stanford.edu/~tjw/jsbn/ (BSD)
