# ravelinjs

`ravelinjs` provides a means of adding cards to Ravelin without having to handle
PCI-compliant data. The library is intended to work on web pages where you have
access to the PAN that the customer has entered. Note that storing this data in
any form on your servers opens them to the PCI compliance requirements. Passing
through the encrypted values provided by this library avoids your servers
handling any sensitive data.

## Usage Guide

### Loading the Library

The ravelin library can be used as a dependency in AMD modules; imported into
scripts bundled using webpack; or by dropping a `<script src="ravelin.min.js">`
into your web page.

Examples:

* [Loading from a `<script>` as `ravelinjs`](test/pages/scripttag) (just use it)
* [Loading into requirejs](test/pages/amd) (just list it as a dependency)
* [Bundling with webpack](test/pages/webpack) (just import it)

### Encrypting Cards

The primary goal of ravelinjs is to allow the secure sharing of card information
with Ravelin without to handling PCI-compliant data. When collecting the card
details, encrypt the values to send to Ravelin using
`ravelinjs.encrypt({pan, month, year, nameOnCard})`. `pan`, `month`, `year` are
required, while `nameOnCard` is optional, and no other properties are allowed
on the object. Some slight validation is performed, and should any fail an
exception is raised.

### Tracking Page Activity

Using ravelinjs, the `setPublicAPIKey` (called immediately), `track`, and
`trackPage` (call on page load) can be used instead of the [device
fingerprinting snippet][device-track]. See the example below for more.

## Example

In the following form, we collect card details from the customer, encrypt them
and send that encrypted values (the cipher) back to your server.

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
    ravelinjs.setPublicAPIKey("pk_live_...");
    ravelinjs.trackPage();

    // Encryption.
    ravelinjs.setRSAKey("..|.....")
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

Once the cipher is received by your server, the API request to Ravelin in which a fraud recommendation is requested should use this cipher value:

```js
/* Server-side */

var card = JSON.parse(form.getValue('ravelinCipherText'));
card.methodType = 'paymentMethodCipher';

var action = request("https://api.ravelin.com/v2/checkout?score=true", {
    // ...
    "paymentMethod": card,
});
```

## Browser Support

Ravelin test its library using [many browsers](test/crossbrowser.conf.js). Older
browser support is provided, but there are caveats on IE10 and other older
browsers who do not implement any `window.crypto`-like API. In these cases,
entropy is collected from user activity on the browser. In cases where
insufficient entropy is collected before `encrypt` is called, an exception is
thrown. This API will be tidied up in future.

## Bundled Code

Providing this library would not have been possible without the stellar works
upon which it relies:

* http://bitwiseshiftleft.github.io/sjcl/ (MIT)
* http://www-cs-students.stanford.edu/~tjw/jsbn/ (BSD)

## Library Roadmap

* Tidy up exceptions used in older browsers where insufficient entropy is
  available when trying to encrypt. Provide recommedations for how to handle
  these exceptions.

[device-track]: https://developer.ravelin.com/v2/#device-tracking