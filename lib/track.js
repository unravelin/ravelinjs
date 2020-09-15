export default function Track(core, cfg) {
  this.core = core;
  if (cfg) this.init(cfg);
}

Track.prototype.init = function(cfg) {
  if (cfg.attach !== false) {
    this.attach();
  }
}

/**
 * attach event listeners at the root of the document to return some key events
 * back to Ravelin.
 */
Track.prototype.attach = function() {
  if (typeof document === 'undefined') {
    throw new Error('ravelin/track: no document global');
  }
  this._attach(document, 'paste', this.onPaste);
}

Track.prototype._attach = function(target, event, handler, thisArg) {
  handler = bind(handler, thisArg || this);
  if (!this._bound) this._bound = [];

  if (target.addEventListener) {
    target.addEventListener(event, handler);
    this._bound.push(function() {
      target.removeEventListener(event, handler);
    });
  } else {
    target.attachEvent('on' + event, handler);
    this._bound.push(function() {
      target.detachEvent('on' + event, handler);
    });
  }
}

/**
 * detach all event listeners.
 */
Track.prototype.detach = function() {
  if (!this._bound) return;
  for (var i = 0; i < this._bound.length; i++) {
    this._bound[i]();
  }
  delete this._bound;
}

Track.prototype.onPaste = function(elem) {
  if (!elem || elem.type === 'password') {
    // Don't track paste events in password fields.
    return;
  }

  var meta = {};

  // Describe the element pasted into.
  if (elem.target) {
    if (elem.target.value) {
      meta.fieldValue = obfsPasteData(elem.target.value);
    }
    if (elem.target.name) {
      meta.fieldName = elem.target.name;
    }
    if (elem.target.form) {
      var form = elem.target.form;
      meta.formName = HTMLElement.prototype.getAttribute.call(form, 'name') || HTMLElement.prototype.getAttribute.call(form, 'id');
      meta.formAction = HTMLElement.prototype.getAttribute.call(form, 'action');
    }
  }

  // Describe the data that was pasted.
  var clipboardData = elem.clipboardData || window['clipboardData'];
  if (clipboardData) {
    var pastedData = clipboardData.getData('Text');
    if (pastedData) {
      meta.panCleaned = detectPAN(pastedData);
      meta.pastedValue = obfsPasteData(pastedData);
    }
  }

  this.core.send('POST', 'z', {
    events: [meta], // FIXME: This isn't right.
  })
}

/**
 * detectPAN returns whether it looks like str contains a card number.
 * @param {string} str
 */
function detectPAN(str) {
  var regex = /\b(?:\d[ -]*){12,16}\d\b/g;
  return regex.test(str);
}

/**
 * obfsPasteData replaces all a-z with X and 0-9 with 0 so that the structure
 * of a paste value is obvious, without revealing the contents.
 * @param {*} str
 */
function obfsPasteData(str) {
  str = str.replace(/[0-9]/g, '0');
  return str.replace(/[A-Za-z]/g, 'X');
}

/**
 * bind wraps a function.
 * @param {Function} fn The function to be called.
 * @param {*} thisArg The 'this' of the invoked fn.
 * @param {...*} [args] Arguments to add to the start of the function call.
 * @returns {Function}
 */
function bind(fn, thisArg, args) {
  args = arguments;
  if (!Function.prototype.bind) {
    return function() {
      return fn.apply(thisArg, Array.prototype.concat.call(args, arguments));
    }
  }
  return Function.prototype.bind.apply(fn, [thisArg].concat(args));
}
