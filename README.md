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
releases][releases] and instantiate your Ravelin instance on the page:

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
functionality of ravelinjs you can choose a bundle with only the components you
need.

The components are:

* **core:** API and error-reporting functionality used by all bundles, and Basic
  device identification:
    * `ravelinDeviceId` cookie
    * `ravelin.core.id()`
* **encrypt:** Card encryption.
    * `ravelin.encrypt.card()`
* **track:** Send page-load, resize and paste events.
    * `ravelin.track.load()`
* **promise:** A Promise polyfill required for Internet Explorer support.
  Optional if you already have your own polyfill or do not want to support any
  version of Internet Explorer.

The [release files][releases] indicate which components they include using a
`+component` naming convention. For example, `ravelin-core+track.min.js`
contains only the core and track components and so cannot be used to encrypt
cards and doesn't guarantee Internet Explorer compatibility.

## Browser Compatibility

RavelinJS v1.0.0 is [tested on IE8-11 and all newer
browsers](test/wdio.conf.js). We plan to drop support for IE8-IE10 soon, so
please contact us if you still support these browsers.

A Promise/A+ polyfill is required for Internet Explorer support. If you do not
have one, or at not sure, then use a +promise ravelinjs bundle.

Card encryption uses window.crypto where available, and otherwise falls back to
a pseudo-random number generator which collects user movements and keypresses as
a source of entropy. If insufficient events have been collected before
encryption has been attempted, an Error is thrown so that we do not insecurely
send card details over the wire.


## Reference

### `var ravelin = new Ravelin({cfg: object})`

During your page load you need to instantiate your `Ravelin` instance:

```javascript
var rav = new Ravelin({
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

### `ravelin.core.id(): Promise<string>`

`ravelin.core.id` returns [a Promise][Promise] which resolves to the device ID
string. This will eventually match the `ravelinDeviceId` cookie. Your goal is to
make a server-side API request to Ravelin where you send the customer's order
and device - using this deviceId - together in a [v2/checkout][postv2checkout]
or [v2/order][postv2order] API request.

HTML example:

```html
<form action=pay>
    <input type=hidden name=device-id id=rav-device-id>
</form>
<script src="ravelin-core.min.js">
<script>
    var ravelin = new Ravelin({
        key: 'publishable_key_...'
    });
    ravelin.core.id().then(function(deviceId) {
        document.getElementById('rav-device-id').value = deviceId;
    });
</script>
```

If you are using a modern bundler and transpiler you can declare:

```js
const deviceId = await ravelin.core.id();
```

Server-side example:

```js
var card = JSON.parse(form.getValue('card-cipher'));
var action = fetch('https://api.ravelin.com/v2/order?score=true', {
    method: 'POST',
    headers: {...},
    body: JSON.stringify({
        timestamp: (new Date).getTime(),
        customerId: customerId,
        order: {...},
        device: {
            deviceId: form.getValue('device-id'),
            userAgent: req.header('User-Agent'),
            ipAddress: req.ip // X-Forwarded-For in express)
        }
    })
});
```

### `ravelin.encrypt.card(card: object): object`

`ravelin.encrypt.card` returns an object describing the encrypted form of the
card details for use with [Ravelin's client-side
encryption](https://developer.ravelin.com/guides/pci/#submission-of-encrypted-card-details).
This object can then be sent via your server to Ravelin without your server
becoming under PCI scope. The object can be used directly as a paymentMethod in
a [v2/checkout][postv2checkout] or [v2/paymentmethod][postv2paymentmethod]
request, for example.

Encrypting card details is only necessary for non-PCI compliant merchants (PCI
SAQ-A or SAQ-AEP merchants) who are otherwise unable to provide card details
(including a valid
[`instrumentId`](https://developer.ravelin.com/apis/v2/#checkout.paymentMethod.0.instrumentId))
to Ravelin when scoring an order.

The full set of fields are:

```js
var cipher = ravelin.encrypt.card({
    /** @prop {string} pan The full card card number. */
    pan: '4111 1111 1111 1111',
    /** @prop {string|number} year The expiry year on the card. 12 => 2012. */
    year: '2020',
    /** @prop {string|number} month The expiry month on the card. 1 => Jan. */
    month: '1',
    /** @prop {string} [nameOnCard] Optional card holder name. */
    nameOnCard: 'Tom Johnson'
});
```

HTML example:

```html
<form action=pay id=payment-form>
    Card Number:  <input name=pan>
    Name:         <input name=name>
    Expiry Year:  <input name=year>
    Expiry Month: <input name=month>
    <input type=hidden name=card-cipher>
</form>
<script src="ravelin-core+encrypt.min.js">
<script>
    var ravelin = new Ravelin({
        key: 'publishable_key_...',
        rsaKey: '0|...'
    });

    var form = document.getElementById('payment-form');
    form.onsubmit = function() {
        // Encrypt the card details in the form.
        var cipher = ravelin.encrypt.card({
            pan: form['pan'].value,
            year: form['year'].value,
            month: form['month'].value,
            nameOnCard: form['name'].value
        });
        // Send the cipher to the server.
        form['card-cipher'].value = JSON.stringify(cipher);
        // Don't send the PAN to the server.
        form['pan'].value = '';
    };
</script>
```

Server-side usage example:

```js
var card = JSON.parse(form.getValue('card-cipher'));
var action = fetch('https://api.ravelin.com/v2/checkout?score=true', {
    method: 'POST',
    headers: {...},
    body: JSON.stringify({
        timestamp: (new Date).getTime(),
        customer: {...},
        order: {...},
        transaction: {...},
        paymentMethod: card,
        device: {...}
    })
});
```

Note that [browsers which do not support
`window.crypto`](https://caniuse.com/cryptography) (including IE8-IE10) rely on
a pseudo-random number generator based on collecting user events from the page
and that if this generator has not collected enough events it may throw an
exception when trying to encrypt.

### `ravelin.track.load()`

Send a page-load event. This is automatically triggered when Ravelin is
instantiated, but can be invoked again on page navigation. Best called after the
page title has been updated from the navigation event - so the [Window
popstate][popstate] event may or may not be appropriate depending on your
framework.

### `ravelin.track.paste(event: ClipboardEvent)`

Send a paste event to Ravelin. Browsers other than IE8 will automatically listen
for pastes into fields and send redacted contents. For example, if a user pastes
"h3ll0, wor1d." into a field Ravelin will receive "X0XX0, XXX0X.". However, if
the pasted content is an `<input type=password>`, any `<input
data-rvn-sensitive=true>`, or a child of any `<div data-rvn-sensitive=true>`
field we will not include any form of pasted value - only that a paste event
occurred.

## Vendored Code

This library would not have been possible without the stellar works upon which
it relies:

* http://bitwiseshiftleft.github.io/sjcl/ (MIT)
* http://www-cs-students.stanford.edu/~tjw/jsbn/ (BSD)

[releases]: https://www.github.com/unravelin/ravelinjs/releases "RavelinJS GitHub Releases"
[postv2order]: https://developer.ravelin.com/apis/v2/#postv2order "Ravelin API: POST /v2/order"
[postv2checkout]: https://developer.ravelin.com/apis/v2/#postv2checkout "Ravelin API: POST /v2/checkout"
[postv2paymentmethod]: https://developer.ravelin.com/apis/v2/#postv2paymentmethod "Ravelin API: POST /v2/paymentmethod"
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise "MDN: JavaScript Promises"
[popstate]: https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event "MDN: Window popstate event"
