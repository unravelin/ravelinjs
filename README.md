# ravelinjs

`ravelinjs` provides a PCI-compliant means of handling card details without ever handling those details yourself, as a merchant.

## Browser & Environment Support

Each build of `ravelinjs` is tested in environments where:

* the script is loaded from a `<script>` tag;
* the script is loaded using `requirejs`;
* the script is bundled into your app using webpack.

### Internet Explorer Compatibility

ravelinjs assumes the availability of a global [`JSON.stringify` which is unavailable for IE <=8 and other older browsers](https://caniuse.com/#feat=json). For a polyfill, consider looking at [json3](https://bestiejs.github.io/json3/).

## Usage Instructions

* `<script>` tag usage
* requirejs usage
* webpack usage