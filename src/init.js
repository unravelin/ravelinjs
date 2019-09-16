var RavelinJS = require('./core');

// ========================================================================================================
//
// initialisation
//

RavelinJS.RavelinJS = RavelinJS;
var rjs = new RavelinJS();

// Register listeners
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('paste', onPaste);
} else if (typeof document !== 'undefined' && document.attachEvent) {
  document.attachEvent('paste', onPaste);
}

function onPaste(elem) {
  if (!elem || elem.type === 'password') {
    return;
  }

  var meta = {};

  if (elem.target) {
    if (elem.target.name) {
      meta.fieldName = elem.target.name;
    }

    if (elem.target.form) {
      meta.formName = elem.target.form.name || elem.target.form.id;
      meta.formAction = elem.target.form.action;
    }
  }

  var clipboardData = elem.clipboardData || window.clipboardData;
  if (clipboardData) {
    var pastedData = clipboardData.getData('Text');

    if (pastedData) {
      meta.panCleaned = detectPAN(pastedData);
      meta.pastedValue = obfsPasteData(pastedData);
    }
  }

  if (elem.target && elem.target.value) {
    meta.fieldValue = obfsPasteData(elem.target.value);
  }

  rjs.track(PASTE_EVENT_TYPE, meta);
}

module.exports = rjs;
