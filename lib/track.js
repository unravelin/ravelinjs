import { uuid } from "./util";
import version from "./version";

export { Track };

/**
 * @typedef {object} TrackConfig
 * @prop {boolean} [init=true] Whether to hook into the browser.
 */

/**
 * @param {Core} core
 * @param {TrackConfig} [cfg]
 */
function Track(core, cfg) {
  this.core = core;

  /** @prop {string} windowId An identifier which lasts until the next page refresh. */
  this.windowId = uuid();
  /** @prop {string} sessionId An identifier which lasts until this website is closed. */
  this.sessionId = core.cookies.get('ravelinSessionId');
  if (!this.sessionId) {
    this.sessionId = uuid();
    core.cookies.set({
      name: 'ravelinSessionId',
      value: this.sessionId
    });
  }

  this.dimensions = windowDimensions();

  // Start tracking events.
  if (cfg.init !== false) {
    this._attachAll();
  }
}

/**
 * _attachAll event listeners at the root of the document to return some key
 * events back to Ravelin.
 * @private
 */
Track.prototype._attachAll = function() {
  this.load();

  this._listeners = [];

  if (document.addEventListener) {
    this._attach({
      target: document,
      addFn: 'addEventListener',
      delFn: 'removeEventListener',
      event: 'paste',
      handler: this.core.bind(this.paste, this)
    });
  }
  if (window.addEventListener) {
    this._attach({
      target: window,
      addFn: 'addEventListener',
      delFn: 'removeEventListener',
      event: 'resize',
      handler: debounce(250, this.core.bind(this.resize, this))
    });
  } else if (window.attachEvent) {
    this._attach({
      target: window,
      addFn: 'attachEvent',
      delFn: 'detachEvent',
      event: 'onresize',
      handler: debounce(250, this.core.bind(this.resize, this))
    });
  }
};

/**
 * _attach mirrors target.addEventListener(event, handler) where addFn would be
 * 'addEventListener' and delFn 'removeEventListener'.
 *
 * @private
 * @param {object} e
 * @param {object} e.target
 * @param {string} e.addFn
 * @param {string} e.delFn
 * @param {string} e.event
 * @param {Function} e.handler
 */
Track.prototype._attach = function(e) {
  this._listeners.push(e);
  var fn = e.target[e.addFn];
  if (fn.call) {
    return fn.call(e.target, e.event, e.handler);
  }
  return fn(e.event, e.handler);
};

/**
 * _detach removes event listeners that we added.
 * @private
 */
Track.prototype._detach = function() {
  while (this._listeners.length > 0) {
    var e = this._listeners.pop();
    var fn = e.target[e.delFn];
    if (fn.call) {
      fn.call(e.target, e.event, e.handler);
    } else {
      fn(e.event, e.handler);
    }
  }
};

/**
 * send an event to Ravelin.
 * @private
 * @param {string} name
 * @param {string} type
 * @param {object} [props]
 */
Track.prototype._send = function(name, type, props) {
  var that = this;
  return this.core.id().then(function(deviceId) {
    return that.core.send('POST', '/z', {events: [{
      eventType: type,
      eventData: {
        eventName: name,
        properties: props
      },

      libVer: version,
      eventMeta: {
        trackingSource: 'browser',
        url: window.location.href,
        ravelinDeviceId: deviceId,
        ravelinSessionId: that.sessionId,
        ravelinWindowId: that.windowId,
        // canonicalUrl: getCanonicalUrl(), // TODO Remove?
        pageTitle: document.title,
        referrer: document.referrer || undefined,
        clientEventTimeMilliseconds: Date.now ? Date.now() : +new Date()
      }

      // TODO Can we get rid of these?
      // customerId: customerId,
      // tempCustomerId: tempCustomerId,
      // orderId: orderId,
    }]});
  });
};

/**
 * load event handler.
 */
Track.prototype.load = function() {
  return this._send('track', 'PAGE_LOADED');
};

/**
 * resize event handler.
 */
Track.prototype.resize = function() {
  // Swap out old sizes.
  var old = this.dimensions;
  var cur = windowDimensions();
  this.dimensions = cur;

  if (old.w === cur.w && old.h === cur.h) {
    return;
  }
  this._send('resize', 'resize', {
    resolutionOld: {
      w: old.w,
      h: old.h
    },
    resolutionNew: {
      w: cur.w,
      h: cur.h
    }
  });
};

function windowDimensions() {
  return {
    w: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
    h: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
  };
}

/**
 * paste event handler.
 * @param {ClipboardEvent} e
 */
Track.prototype.paste = function(e) {
  var sensitive = false;
  var props = {};

  var t = e && e.target;
  if (t) {
    // Locate the field.
    props.fieldName = t.name || t.id || undefined;
    if (t.form) {
      props.formName = attr(t.form, 'name') || attr(t.form, 'id');
      props.formAction = attr(t.form, 'action');
    }

    // Look at the value, if safe.
    sensitive = t.type == 'password' || attr(t, 'data-rvn-sensitive') == 'true';
    if (!sensitive) {
      if (t.value) {
        props.fieldValue = obfsPasteData(t.value);
      }
      if (typeof t.selectionStart === 'number') {
        props.selectionStart = t.selectionStart;
        props.selectionEnd = t.selectionEnd;
      }
    }
  }

  // Describe the pasted content, if safe.
  if (!sensitive && e && e.clipboardData) {
    // Don't consider window.clipboardData: it prompts the user.
    var pastedData = e.clipboardData.getData("Text") || e.clipboardData.getData("text/plain");
    if (pastedData) {
      props.panCleaned = detectPAN(pastedData);
      props.pastedValue = obfsPasteData(pastedData);
    }
  }

  return this._send('paste', 'paste', props);
};



/**
 * detectPAN returns whether it looks like str contains a card number.
 * @private
 * @param {string} str
 */
function detectPAN(str) {
  // Disregard space or dash separators between characters.
  str = str.replace(/[ -]+/g, '');

  // Find each sequence of digits.
  var nums = /\d+/g;
  var match;
  while ((match = nums.exec(str)) !== null) {
    if (match[0].length >= 12 && match[0].length <= 16) {
      // If there was a sequence of digits between 12 or 16 characters long,
      // consider it a PAN.
      return true;
    }
  }
  return false;
}

/**
 * obfsPasteData replaces all a-z with X and 0-9 with 0 so that the structure
 * of a paste value is obvious, without revealing the contents.
 * @private
 * @param {*} str
 */
function obfsPasteData(str) {
  str = str.replace(/[0-9]/g, '0');
  return str.replace(/[A-Za-z]/g, 'X');
}

/**
 * attr returns e.getAttribute(name) but attr(e, "name") works even if e is a
 * <form><input name=name /></form>.
 * @private
 * @param {HTMLElement} e
 * @param {string} name
 */
function attr(e, name) {
  return HTMLElement.prototype.getAttribute.call(e, name);
}

/**
 * debounce returns a function that calls fn after delayMs of the function not
 * being called. Arguments from the latest invocation are used.
 *
 * @private
 * @param {number} delayMs
 * @param {Function} fn
 */
function debounce(delayMs, fn) {
  var wait;
  return function() {
    var args = arguments;
    if (wait) clearTimeout(wait);
    wait = setTimeout(function() {
      fn.apply(null, args);
    }, delayMs);
  };
}
