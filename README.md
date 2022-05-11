# ravelinjs

ravelinjs is a JavaScript library for the browser to augment your integration
with:

* an identifier for the customer's browser to be attached to an order (core);
* simple page events like loading, pasting and resizing (track); and
* cardholder data encrypted for transmission through your server (encrypt).

Gathering these values accurately, and ensuring they are made available to
Ravelin through our API or by calls made directly from this SDK, is critical to
a successful Ravelin integration.

Please feel welcome to create issues or submit pull requests on [the
project](https://github.com/unravelin/ravelinjs). The [Contribution
Guidelines](https://github.com/unravelin/ravelinjs/blob/v1/CONTRIBUTING.md)
detail how to write and test code for ravelinjs.

Note that this documentation is for version 1 of ravelinjs. For version 0,
please see its [usage guide](https://developer.ravelin.com/libraries-and-sdks/ravelinjs/v0/usage-guide/),
[reference](https://developer.ravelin.com/libraries-and-sdks/ravelinjs/v0/reference/)
and [source](https://github.com/unravelin/ravelinjs/tree/v0).

## Table of Contents

* [Quickstart](#quickstart)
* [Bundles](#bundles)
  * [npm](#npm)
* [Content-Security-Policy](#content-security-policy)
* [Script Integrity](#script-integrity)
* [Browser Compatibility](#browser-compatibility)
* [Reference](#reference)
  * [`var ravelin = new Ravelin({cfg: object})`](#var-ravelin--new-ravelincfg-object)
  * [`ravelin.core.id(): Promise<string>`](#ravelincoreid-promisestring)
  * [`ravelin.encrypt.card(card: object): object`](#ravelinencryptcardcard-object-object)
  * [`ravelin.track.load()`](#ravelintrackload)
  * [`ravelin.track.event(name, [props])`](#ravelintrackeventname-props)
  * [`ravelin.track.paste(event: ClipboardEvent)`](#ravelintrackpasteevent-clipboardevent)
* [Vendored Code](#vendored-code)
* [Upgrading](#upgrading)
  * [Upgrading to ravelinjs v1 from ravelinjs v0](#upgrading-to-ravelinjs-v1-from-ravelinjs-v0)
  * [Upgrading to ravelinjs v1 from cdn.ravelin.net script snippet](#upgrading-to-ravelinjs-v1-from-cdnravelinnet-script-snippet)

## Quickstart

Add `https://*.ravelin.click` to your site's [Content-Security-Policy
`connect-src`][csp-connect] directive. Get a copy of
[ravelin-core+track+encrypt+promise.min.js on Github releases][releases] and
instantiate your Ravelin instance on the page:

```html
<script src="ravelin-core+track+encrypt+promise.min.js"></script>
<script>var ravelin = new Ravelin({key: 'publishable_key_...'})</script>
```

> If you have a build system, you can instead install [ravelinjs with
> npm](https://npmjs.com/ravelinjs) using `npm i ravelinjs@1` and require or
> import Ravelin for instantiating:
>
> ```js
> import Ravelin from 'ravelinjs/core+track+encrypt+promise';
> /* or */ const Ravelin = require('ravelinjs/core+track+encrypt+promise');
> var ravelin = new Ravelin({key: 'publishable_key_...'});
> ```

This will set the `ravelinDeviceId` cookie on your domain, send a page-load
event, and then allow you to call:

* `ravelin.core.id().then(function(id) { ... })` to get the deviceId.
* `ravelin.encrypt.card({pan: "4111 ..."})` to encrypt cardholder data to be sent
  to Ravelin.
* `ravelin.track.load()` to track a page load.

If you are wanting to track paste events then lastly add a `data-rvn-pan`
attribute to any inputs the user types a credit/debit card number into, and a
`data-rvn-sensitive` to or around any elements you don't want Ravelin to report
any content from.

→ Read on for more details.

***

## Bundles

The quickstart suggests using `ravelin-core+track+encrypt+promise.min.js` which
contains all functionality offered by ravelinjs and is therefore the easiest to
get started with but also the largest file. If you are not using all of the
functionality of ravelinjs you can choose a bundle with only the components you
need.

The components are:

* **core:** API and error-reporting functionality used by all bundles, and Basic
  device identification with `ravelin.core.id()` or a `ravelinDeviceId` cookie.
* **encrypt:** Cardholder data encryption with `ravelin.encrypt.card()`.
* **track:** Automatically send page-load, resize and paste events, or manually
  with `ravelin.track.load()`.
* **promise:** Provide a fallback Promise polyfill required for Internet
  Explorer support. Optional if you already have your own polyfill or do not
  want to support any version of Internet Explorer.

The [release files][releases] indicate which components they include using a
`+component` naming convention. For example, `ravelin-core+track.min.js`
contains only the core and track components and so cannot be used to encrypt
cards and doesn't guarantee Internet Explorer compatibility.

### npm

If you have a JavaScript build system and would prefer to include ravelinjs
using it, you can install [ravelinjs from
npm](https://www.npmjs.com/package/ravelinjs) with:

```bash
npm install ravelinjs@1
```

You can then import the desired bundle within the ravelinjs library. For
example, to load the core+track bundle using `require` is:

```js
var Ravelin = require('ravelinjs/core+track');
```

Or to load card encryption with ES6 imports is:

```js
import Ravelin from 'ravelinjs/core+encrypt';
```

The bundles published to npm are in [Universal Module Definition format](https://www.davidbcalhoun.com/2014/what-is-amd-commonjs-and-umd/).

## Content-Security-Policy

RavelinJS will send track events and error reports back to the Ravelin API as
configured in the `api` initialisation property, or inferred from your API key.
If your site is configured with a Content-Security-Policy, be sure to add the
API to the `connect-src` directive:

```http
Content-Security-Policy: connect-src 'self' https://*.ravelin.click;
```

## Script Integrity

If you are including a ravelin bundle directly on your page, rather than in your
build system, we recommended setting the `integrity` attribute on the script tag
to the corresponding value from the integrity file of the release. For example,
if the integrity file reads:

    sha384-8de9e022e2f67e2072bb114e670d2fb37cab8eaf81616bcc3951087aa473e62a8b9fcc4c780a8d8d09df55c8b63bfd7c  ravelin-1.0.0-rc1-core+promise.js

then your HTML becomes:

```html
<script src="ravelin-1.0.0-rc1-core+promise.js" integrity="sha384-8de9e022e2f67e2072bb114e670d2fb37cab8eaf81616bcc3951087aa473e62a8b9fcc4c780a8d8d09df55c8b63bfd7c">
```

If the integrity file is next to the script in question, you can validate the
contents using:

    sed s/^sha384-// integrity | shasum -c

## Browser Compatibility

RavelinJS v1.0.0 is [tested on IE8-11 and all newer
browsers](test/wdio.conf.js). We plan to drop support for IE8-IE10 soon, so
please contact us if you still support these browsers.

A Promise/A+ polyfill is required for Internet Explorer support. If you do not
have one, or are not sure, then use a +promise ravelinjs bundle.

Card encryption uses window.crypto where available, and otherwise falls back to
a pseudo-random number generator which collects user movements and keypresses as
a source of entropy. If insufficient events have been collected before
encryption is attempted, an Error is thrown to prevent insecure transmission of
cardholder data.

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
     * production, or another environment identified by the key. If you set a
     * Content-Security-Policy then add the api to the connect-src directive.
     */
    // api: 'https://live.ravelin.click/',
    /**
     * @prop {string|Promise<string>} [id] An explicit deviceId to use. If set,
     * Ravelin won't attempt to maintain a deviceId of its own. However, if the
     * given Promise errors or resolves to an empty value, we fall back to the
     * built-in behaviour.
     */
    // id: 'my-device-id',
    // id: new Promise(r => r('my-device-id')),
    /**
     * @prop {string} [cookie=ravelinDeviceId] The cookie that the deviceId is
     * persisted in.
     */
    // cookie: 'my-guid',
    /**
     * @prop {number} [cookieExpiryDays] The number of days that a device ID will live.
     * Defaults to 365 in accordance with the GDPR's ePrivacy Directive.
     */
    // cookieExpiryDays: 365,
    /**
     * @prop {string} [cookieDomain] The top-most domain that we can store
     * cookies on. If you expect your customer to navigate between multiple
     * subdomains, e.g. catalog.store.com, checkout.store.com, then set
     * cookieDomain to store.com.
     */
    // cookieDomain: 'store.com',
    /**
     * @prop {PromiseConstructor} [Promise] An injectable Promise implementation
     * to use. If not provided, defaults to window.Promise or a polyfill if the
     * +promise component is included. Ravelin.Promise contains the default.
     */
    // Promise: window.Promise,
    /**
     * @prop {string} [rsaKey] The public key used to encrypt cardholder data.
     */
    // rsaKey: '0|...',
    /**
     * @prop {Object|Boolean} [page] Additional properties to describe the
     * initial page load event. If false, suppresses the initial page-load event.
     * Must be JSON-encodable.
     */
    // page: {section: 'about'}
    /**
     * @prop {function} [classifyPaste] Override logic for detecting pasted PANs or sensitive values.
     * @param {ClipboardEvent} e The paste event
     * @returns {Object} c
     * @returns {Boolean} [c.pan] Whether the user pasted into a PAN field. If omitted, we look for the data-rvn-pan attribute.
     * @returns {Boolean} [c.sensitive] Whether the user pasted into a sensitive field. Prevents the pasted value's shape being shared with Ravelin if true. If omitted, we look for the data-rvn-sensitive attribute.
     */
    // classifyPaste: e => ({
    //  pan: e.target.hasAttribute('data-rvn-pan'),
    //  sensitive: treeHasAttr(e.target, 'data-rvn-sensitive')
    // })
});
```

### `ravelin.core.id(): Promise<string>`

`ravelin.core.id` returns [a Promise][Promise] which resolves to the device ID
string. This will eventually match the `ravelinDeviceId` cookie. Your goal is to
make a server-side API request to Ravelin where you send the customer's order
and device - using this deviceId - together in a [v2/checkout][postv2checkout]
or [v2/order][postv2order] API request, or the customer and device in a
[v2/connect][postv2connect] API request.

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
            ipAddress: req.ip, // X-Forwarded-For in Express JS.
            language: req.header('Accept-Language'),
        }
    })
});
```

#### Device ID Format

The device ID in the `ravelinDeviceId` cookie or returned by `ravelin.core.id()`
should be treated as an opaque string. Do not attempt to parse or validate the
format of the ID as we may change it without warning in the future.

### `ravelin.encrypt.card(card: object): object`

`ravelin.encrypt.card` returns an object describing the encrypted form of
cardholder data for use with [Ravelin's client-side
encryption](https://developer.ravelin.com/guides/pci/#submission-of-encrypted-card-details).
This object can then be sent via your server to Ravelin without increasing the
scope of PCI compliance required of your server. The object can be used directly
as a paymentMethod in a [v2/checkout][postv2checkout],
[v2/paymentmethod][postv2paymentmethod] or [v2/connect][postv2connect] request,
for example.

Encrypting cardholder data is only necessary for non-PCI compliant merchants (PCI
SAQ-A or SAQ-AEP merchants) who are otherwise unable to provide cardholder data
(including a valid
[`instrumentId`](https://developer.ravelin.com/apis/v2/#checkout.paymentMethod.0.instrumentId))
to Ravelin when scoring an order.

The full set of fields are:

```js
var cipher = ravelin.encrypt.card({
    /** @prop {string} pan The full primary account number of the card. */
    pan: '4111 1111 1111 1111',
    /** @prop {string|number} year The expiry year on the card. 12 => 2012. */
    year: '2020',
    /** @prop {string|number} month The expiry month on the card. 1 => Jan. */
    month: '1',
    /** @prop {string} [nameOnCard] Optional cardholder name. */
    nameOnCard: 'Tom Johnson'
    /** @prop {string} [rsaKey] Optional RSA public key to use. Can be set during instantiation. */
    // rsaKey: '0|...',
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
        // Encrypt the cardholder data in the form.
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
instantiated, but should be invoked manually after page navigation in a
single-page app. To ensure the correct page title is collected, call after the
page content has loaded - so the [Window popstate][popstate] event may be too
early.

### `ravelin.track.event(name, [props])`

Send a named event to attach to the session, with optional descriptive
properties. Most event names use "UPPER_SNAKE_CASE" but the most important thing
is to have consistency between your browser and mobile applications where they
have common events. Returns a Promise that resolves once the event has been
sent.

### `ravelin.track.paste(event: ClipboardEvent)`

Send a paste event to Ravelin. This is done automatically if the paste happens
in the same frame Ravelin is instantiated - except on IE8 which does not support
paste-event listening at the document level.

To correctly identify the paste contents you should annotate your forms with
attributes:

* `data-rvn-pan` if the user enters a credit-card number into that input; or
* `data-rvn-sensitive` if no values should be shared in the event back to Ravelin.

> Note: It is possible to override these attributes by providing custom `classifyPaste` logic in your `Ravelin` instance. See [Reference](#reference).

The paste event contains information about where the paste happened and
approximate shape of the paste content. For example, if a user pastes "h3ll0,
wor1d." into a field, Ravelin will receive "X0XX0, XXX0X.". However, if the
pasted content is an `<input type=password>`, a `<input data-rvn-sensitive>` or
a child of any `<div data-rvn-sensitive>` (if using the default attributes) field we will not include any form of
pasted value - only that a paste event occurred.

## Vendored Code

This library would not have been possible without the stellar works upon which
it relies:

* http://bitwiseshiftleft.github.io/sjcl/ (MIT)
* http://www-cs-students.stanford.edu/~tjw/jsbn/ (BSD)

## Upgrading

Note that the format of the deviceId was changed in v1 to include a "rjs-"
prefix. If you do any validation or parsing that checks for a particular
format of the deviceId, please remove this logic and instead treat the deviceId as
an opaque string.

### Upgrading to ravelinjs v1 from ravelinjs v0

If you are using RavelinJS v0 from a script or loaded via npm then equivalent
functionality is now covered by bundles  with the core+track+encrypt components.
Please review which components you need in the [bundles](#bundles) and complete
the [quickstart] setup instructions. You can now remove cdn.ravelin.net from
your Content-Security-Policy and make the following substitutions to complete
the upgrade:

* `ravelinjs.setFallbackJS(src)` → Removed.
* `ravelinjs.setCookieDomain(domain)` → Set during instantiation in `new
  Ravelin({cookieDomain: 'c.com'})`.
* `ravelinjs.setPublicAPIKey(apiKey)` → Set during instantiation in `new Ravelin({key: apiKey})`.
* `ravelinjs.setRSAKey(rawPubKey)` → Set during instantiation in `new Ravelin({rsaKey: rawPubKey})`.
* `ravelinjs.setCustomerId(customerId)` → Removed.
* `ravelinjs.setTempCustomer` → Removed.
* `ravelinjs.encrypt(card)` → `JSON.stringify(ravelin.encrypt.card(card))`
* `ravelinjs.encryptAsObject(card)` → `ravelin.encrypt.card(card)`
* `ravelinjs.track(eventName, meta)` → Removed.
* `ravelinjs.trackPage(meta)` → `ravelin.track.load()`
* `ravelinjs.trackLogout(meta)` → Removed.
* `ravelinjs.trackFingerprint(customer)` → Removed. This method implemented some
  privacy-insensitive browser fingerprinting that Ravelin no longer wishes to be
  part of. Instead, follow the instructions of
  [`ravelin.core.id()`][ravelin.core.id] to send the device via your server.
* `ravelinjs.setOrderId(orderId)` → Removed.

### Upgrading to ravelinjs v1 from cdn.ravelin.net script snippet

If you previously used a snippet such as

```js
(function(r,a,v,e,l,i,n){r[l]=r[l]||function(){(r[l].q=r[l].q||[]).push(arguments)};i=a.createElement(v);i.async=i.defer=1;i.src=e;a.body.appendChild(i)})(window,document,'script','https://cdn.ravelin.net/ravelin-beta.min.js','ravelin');
```

or

```js
(function r(a,v,e,l,i,n){a[e]=a[e]||function(){(a[e].q=a[e].q||[]).push(arguments)};n=v.createElement("script");n.async=n.defer=1;n.src=l;if(i)n.onerror=function(){r(a,v,e,i)};v.body.appendChild(n)})(window,document,"ravelin","https://cdn.ravelin.net/js/rvn-beta.min.js","/rvn-lite.min.js")
```

then the functionality you were using is covered by bundles with the core+track
components. After following the [quickstart] instructions you can remove
cdn.ravelin.net from your Content-Security-Policy, and make the following
substitutions to complete the upgrade:

* `ravelin('setApiKey', 'k')` → Set during instantiation in `new Ravelin({key: 'k'})`.
* `ravelin('setCookieDomain', 'c')` → Set during instantiation in `new
  Ravelin({cookieDomain: 'c.com'})`.
* `ravelin('track')` → Removed.
* `ravelin('trackPage')` → [`ravelin.track.load()`][ravelin.track.load] is now
  called when Ravelin is instantiated, but you can call this method again when
  the user navigates if you have a single-page application.
* `ravelin('trackLogin')` → Removed.
* `ravelin('trackLogout')` → Removed.
* `ravelin('fingerprint')` → Removed. This method implemented some
  privacy-insensitive browser fingerprinting that Ravelin no longer wishes to be
  part of. Instead, follow the instructions of
  [`ravelin.core.id()`][ravelin.core.id] to send the device via your server.
* `ravelin('send')` → Removed
* `ravelin('setCustomerId')` → Removed.
* `ravelin('setTempCustomerId')` → Removed.
* `ravelin('setOrderId')` → Removed.

[ravelin.encrypt.card]: #ravelinencryptcardcard-object-object

[ravelin.track.load]: #ravelintrackload

[ravelin.core.id]: #ravelincoreid-promisestring

[quickstart]: #quickstart "RavelinJS Quickstart Instructions"

[releases]: https://www.github.com/unravelin/ravelinjs/releases "RavelinJS GitHub Releases"

[postv2order]: https://developer.ravelin.com/apis/v2/#postv2order "Ravelin API: POST /v2/order"

[postv2checkout]: https://developer.ravelin.com/apis/v2/#postv2checkout "Ravelin API: POST /v2/checkout"

[postv2paymentmethod]: https://developer.ravelin.com/apis/v2/#postv2paymentmethod "Ravelin API: POST /v2/paymentmethod"

[postv2connect]: https://developer.ravelin.com/apis/connect/#postv2connect "Ravelin Connect API: POST /v2/connect"

[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise "MDN: JavaScript Promises"

[popstate]: https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event "MDN: Window popstate event"

[csp-connect]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/connect-src "MDN: Content-Security-Policy connect-src"
