/* globals isolate */
var expectedVersion = /^\d+.\d+.\d+(-.+)?-ravelinjs$/;

describe('ravelin.track', function() {
  var r;

  // afterEach(cleanup) seems to invoke cleanup() after tests return, which is
  // before async tests actually complete.
  beforeEach(cleanup);
  after(cleanup);
  function cleanup() {
    xhook.destroy();
    if (r) {
      r.track._detach();
      r = null;
    }
  }

  describe('#load', function() {
    it('sends upon instantiation', function(done) {
      var key = this.test.fullTitle();
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        r.core.ids().then(function(ids) {
          var loadEvent = JSON.parse(req.body).events[0];
          expect(loadEvent).to.have.property('eventType', 'track');
          expect(loadEvent.libVer).to.match(expectedVersion);
          expect(loadEvent.eventData).to.eql({eventName: 'PAGE_LOADED'});
          expect(loadEvent.eventMeta.trackingSource).to.be('browser');
          expect(loadEvent.eventMeta.ravelinDeviceId).to.be(ids.device);
          expect(loadEvent.eventMeta.ravelinSessionId).to.be(ids.session);
        }).then(done, done);
        return {status: 204};
      });
      r = new Ravelin(isolate({key: key, api: '/'}));
    });

    it('sends page props upon instantiation', function(done) {
      var key = this.test.fullTitle();
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        r.core.ids().then(function(ids) {
          var loadEvent = JSON.parse(req.body).events[0];
          expect(loadEvent).to.have.property('eventType', 'track');
          expect(loadEvent.libVer).to.match(expectedVersion);
          expect(loadEvent.eventData).to.eql({eventName: 'PAGE_LOADED', properties: {section: 'test'}});
          expect(loadEvent.eventMeta.trackingSource).to.be('browser');
          expect(loadEvent.eventMeta.ravelinDeviceId).to.be(ids.device);
          expect(loadEvent.eventMeta.ravelinSessionId).to.be(ids.session);
        }).then(done, done);
        return {status: 204};
      });
      r = new Ravelin(isolate({key: key, api: '/', page: {section: 'test'}}));
    });

    it('doesnt send a page-loaded event when initialised with page:false', function(done) {
      var key = this.test.fullTitle();
      var errored = false;
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};
        errored = true;
        done('received an API request but should have gotten none: ' + JSON.stringify(req));
        return {status: 204};
      });
      r = new Ravelin(isolate({key: key, api: '/', page: false}));
      setTimeout(function() { if (!errored) done(); }, 200);
    });

    it('doesnt send resize or page-loaded events when initialised with track:false', function(done) {
      var key = this.test.fullTitle();
      var errored = false;
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};
        errored = true;
        done('received an API request but should have gotten none: ' + JSON.stringify(req));
        return {status: 204};
      });

      r = new Ravelin(isolate({key: key, api: '/', track: false}));
      try {
        triggerResize(10, 0);
      } catch (e) {
        // If triggerResize fails, we can still test we sent no page-load event.
      }
      setTimeout(function() { if (!errored) done(); }, 200);
    });

    it('can be manually initialised', function(done) {
      var key = this.test.fullTitle();
      var errored = false;
      var waited = false;
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        if (!waited) {
          errored = true;
          done('received an API request but should have gotten none: ' + JSON.stringify(req));
        } else {
          r.core.ids().then(function(ids) {
            var loadEvent = JSON.parse(req.body).events[0];
            expect(loadEvent).to.have.property('eventType', 'track');
            expect(loadEvent.libVer).to.match(expectedVersion);
            expect(loadEvent.eventData).to.eql({eventName: 'PAGE_LOADED', properties: {section: 'test'}});
            expect(loadEvent.eventMeta.trackingSource).to.be('browser');
            expect(loadEvent.eventMeta.ravelinDeviceId).to.be(ids.device);
            expect(loadEvent.eventMeta.ravelinSessionId).to.be(ids.session);
          }).then(done, done);
        }
        return {status: 204};
      });
      r = new Ravelin(isolate({key: key, api: '/', track: false}));
      setTimeout(function() {
        if (errored) return;
        waited = true;
        r.track.init({section: 'test'});
      }, 200);
    });

    it('sends resize events', function(done) {
      var key = this.test.fullTitle();
      var props = {
        resolutionOld: {w: window.outerWidth, h: window.outerHeight},
        resolutionNew: {w: window.outerWidth+20, h: window.outerHeight}
      };

      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        var event = JSON.parse(req.body);
        if (!event || !event.events || !event.events[0] || event.events[0].eventType !== 'resize') {
          return {status: 204};
        }

        // Validate the event.
        r.core.ids().then(function(ids) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'resize');
          expect(event.libVer).to.match(expectedVersion);
          expect(event.eventMeta.trackingSource).to.be('browser');
          expect(event.eventMeta.ravelinDeviceId).to.be(ids.device);
          expect(event.eventMeta.ravelinSessionId).to.be(ids.session);
          expect(event.eventData).to.eql({
            eventName: 'resize',
            properties: props
          });
        }).then(done, done);
        return {status: 204};
      });

      // Load the library.
      r = new Ravelin(isolate({key: key, api: '/'}));

      // Send two resize events. Should only get one request after debouncing.
      try {
        triggerResize(10, 0);
        triggerResize(10, 0);
      } catch (e) {
        // If we fail to trigger a resize, we can fall back on the more reliable
        // integration test which definitely works.
        this.skip();
      }
    });

    it('sends custom fields', function(done) {
      var key = this.test.fullTitle();
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        r.core.ids().then(function(ids) {
          var loadEvent = JSON.parse(req.body).events[0];
          expect(loadEvent).to.have.property('eventType', 'track');
          expect(loadEvent.libVer).to.match(expectedVersion);
          expect(loadEvent.eventData).to.eql({eventName: 'PAGE_LOADED', properties: {section: 'manually-invoked'}});
          expect(loadEvent.eventMeta.trackingSource).to.be('browser');
          expect(loadEvent.eventMeta.ravelinDeviceId).to.be(ids.device);
          expect(loadEvent.eventMeta.ravelinSessionId).to.be(ids.session);
        }).then(done, done);
        return {status: 204};
      });
      r = new Ravelin(isolate({key: key, api: '/', init: false}));
      r.track.load({section: 'manually-invoked'});
    });
  });

  describe('#event', function() {
    it('sends custom events', function(done) {
      var key = this.test.fullTitle();
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        r.core.ids().then(function(ids) {
          var e = JSON.parse(req.body).events[0];
          expect(e).to.have.property('eventType', 'track');
          expect(e.libVer).to.match(expectedVersion);
          expect(e.eventData).to.eql({eventName: 'custom-event'});
          expect(e.eventMeta.trackingSource).to.be('browser');
          expect(e.eventMeta.ravelinDeviceId).to.be(ids.device);
          expect(e.eventMeta.ravelinSessionId).to.be(ids.session);
        }).then(done, done);
        return {status: 204};
      });
      r = new Ravelin(isolate({key: key, api: '/', init: false}));
      r.track.event('custom-event');
    });

    it('sends custom events with properties', function(done) {
      var key = this.test.fullTitle();
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        r.core.ids().then(function(ids) {
          var e = JSON.parse(req.body).events[0];
          expect(e).to.have.property('eventType', 'track');
          expect(e.libVer).to.match(expectedVersion);
          expect(e.eventData).to.eql({eventName: 'custom-event', properties: {extra: true}});
          expect(e.eventMeta.trackingSource).to.be('browser');
          expect(e.eventMeta.ravelinDeviceId).to.be(ids.device);
          expect(e.eventMeta.ravelinSessionId).to.be(ids.session);
        }).then(done, done);
        return {status: 204};
      });
      r = new Ravelin(isolate({key: key, api: '/', init: false}));
      r.track.event('custom-event', {extra: true});
    });
  });

  describe('#paste', function() {
    // IE8 doesn't support createEvent or paste handling at all.
    var capable = !!document.createEvent;
    // Safari is difficult to craft a paste event for?
    var capableContent = !!fakePasteEvent('text/plain', 'test').clipboardData;

    $([
      {
        paste: '4234 5678 901',
        into: '<input name=name data-rvn-pan />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000 000', panCleaned: false}
      },
      {
        paste: '4234 5678 9012',
        into: '<input name=name data-rvn-pan />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000 0000', panCleaned: true}
      },
      {
        paste: '4234 5678 9012 3',
        into: '<input name=name data-rvn-pan />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000 0000 0', panCleaned: true}
      },
      {
        paste: '4234 5678 9012 3',
        into: '<input name=name />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000 0000 0'}
      },
      {
        paste: '尺卂ᐯ乇ㄥ丨几',
        into: '<input name=name />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: 'XXXXXXX'}
      },
      {
        paste: '4234 5678 9012 34',
        into: '<input name=name data-rvn-pan />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000 0000 00', panCleaned: true}
      },
      {
        paste: '4234 5678 9012 345',
        into: '<input name=name data-rvn-pan />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000 0000 000', panCleaned: true}
      },
      {
        paste: '4234 5678 9012-3456',
        into: '<input name=name data-rvn-pan />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000 0000-0000', panCleaned: true}
      },
      {
        paste: '4234 5678-9012 3456 7',
        into: '<input name=name data-rvn-pan />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000-0000 0000 0', panCleaned: true}
      },
      {
        paste: '4234 5678 9012 3456 78',
        into: '<input name=name data-rvn-pan />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000 0000 0000 00', panCleaned: true}
      },
      {
        paste: '4234 5678 9012 3456 789',
        into: '<input name=name data-rvn-pan />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000 0000 0000 000', panCleaned: true}
      },
      {
        paste: '4234 5678 9012 3456 7890',
        into: '<input name=name data-rvn-pan />',
        props: {fieldName: 'name', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000 0000 0000 0000', panCleaned: false}
      },
      {
        paste: '4234 5678-9012 3456 7',
        into: '<input name=name data-rvn-pan data-rvn-sensitive />',
        props: {fieldName: 'name', panCleaned: true}
      },
      {
        paste: '4234 5678-9012 3456 7',
        into: '<input name=name data-rvn-sensitive />',
        props: {fieldName: 'name'}
      },
      {
        paste: '4234 5678-9012 3456 7',
        into: '<div data-rvn-sensitive><input name=name></div>',
        props: {fieldName: 'name'}
      },
      {
        paste: 'h3ll0, wor1d.',
        into: '<form action=/ name="form-name"><input name=action></form>',
        props: {fieldName: 'action', formName: 'form-name', formAction: '/', selectionStart: 0, selectionEnd: 0, pastedValue: 'X0XX0, XXX0X.'}
      },
      {
        paste: 'hello',
        into: '<form action=/ name="form-name"><input type=password name=action></form>',
        props: {fieldName: 'action', formName: 'form-name', formAction: '/'}
      },
      {
        paste: 'hello',
        into: '<form action=/ name="form-name"><input type=password name=action></form>',
        props: {fieldName: 'action', formName: 'form-name', formAction: '/'}
      },
      {
        paste: '4234 5678-9012 3456 7',
        into: '<input name=custom-pan />',
        props: {fieldName: 'custom-pan', selectionStart: 0, selectionEnd: 0, pastedValue: '0000 0000-0000 0000 0', panCleaned: true},
        cfg: {
          classifyPaste: function(e) {
            return {
              pan: true
            };
          }
        }
      },
      {
        paste: '4234 5678-9012 3456 7',
        into: '<input name=custom-sensitive />',
        props: {fieldName: 'custom-sensitive'},
        cfg: {
          classifyPaste: function(e) {
            return {
              sensitive: true
            };
          }
        }
      },
      {
        paste: 'hello',
        into: '<input name=custom-sensitive />',
        props: {fieldName: 'custom-sensitive', panCleaned: true},
        cfg: {
          classifyPaste: function(e) {
            return {
              pan: true,
              sensitive: true
            };
          }
        }
      },
      {
        paste: 'hello',
        into: '<input name=custom-pan />',
        props: {fieldName: 'custom-pan', selectionStart: 0, selectionEnd: 0, pastedValue: 'XXXXX'},
        classifyPaste: function(e) {
          return {
            pan: false,
            sensitive: false
          };
        }
      }
    ]).each(function(n, test) {
      it('sends redacted paste events of ' + JSON.stringify(test), function(done) {
        if (!capable) this.skip();

        var key = this.test.fullTitle();
        xhook.before(function(req) {
          if (!keysMatch(req, key)) return {status: 204};

          var event = JSON.parse(req.body);
          if (!event || !event.events || !event.events[0] || event.events[0].eventType !== 'paste') {
            return {status: 204};
          }

          if (!capableContent) {
            delete test.props.pastedValue;
            // If we can't check the paste contents then we assume all pastes
            // into pan fields contain pans.
            if ('panCleaned' in test.props) test.props.panCleaned = true;
          }

          // Validate the event.
          r.core.ids().then(function(ids) {
            event = event.events[0];
            expect(event).to.have.property('eventType', 'paste');
            expect(event.libVer).to.match(expectedVersion);
            expect(event.eventMeta.trackingSource).to.be('browser');
            expect(event.eventMeta.ravelinDeviceId).to.be(ids.device);
            expect(event.eventMeta.ravelinSessionId).to.be(ids.session);
            expect(event.eventData).to.eql({
              eventName: 'paste',
              properties: test.props
            });
          }).then(done, done);
          return {status: 204};
        });

        r = new Ravelin(isolate($.extend({}, test.cfg, {key: key, api: '/'})));

        var input = $(test.into).appendTo(document.body);
        input = input.find('input')[0] || input[0];
        input.dispatchEvent(fakePasteEvent('text/plain', test.paste));
      });
    });

    it('sends empty paste events from sensitive fields', function(done) {
      if (!capable) this.skip();

      var key = this.test.fullTitle();
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        var event = JSON.parse(req.body);
        if (!event || !event.events || !event.events[0] || event.events[0].eventType !== 'paste') {
          return {status: 204};
        }

        // Validate the event.
        r.core.ids().then(function(ids) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'paste');
          expect(event.libVer).to.match(expectedVersion);
          expect(event.eventMeta.trackingSource).to.be('browser');
          expect(event.eventMeta.ravelinDeviceId).to.be(ids.device);
          expect(event.eventMeta.ravelinSessionId).to.be(ids.session);
          expect(event.eventData).to.eql({
            eventName: 'paste',
            properties: {
              fieldName: 'hello',
              formName: 'form-name',
              formAction: '/'
            }
          });
        }).then(done, done);
        return {status: 204};
      });

      r = new Ravelin(isolate({key: key, api: '/'}));

      var input = $('<form action=/ name="form-name"><input name=hello data-rvn-sensitive=true></form>')
        .appendTo(document.body)
        .find("input")[0];
      input.dispatchEvent(fakePasteEvent('text/plain', 'hello'));
    });

    it('sends empty paste events from password fields', function(done) {
      if (!capable) this.skip();

      var key = this.test.fullTitle();
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        var event = JSON.parse(req.body);
        if (!event || !event.events || !event.events[0] || event.events[0].eventType !== 'paste') {
          return {status: 204};
        }

        // Validate the event.
        r.core.ids().then(function(ids) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'paste');
          expect(event.libVer).to.match(expectedVersion);
          expect(event.eventMeta.trackingSource).to.be('browser');
          expect(event.eventMeta.ravelinDeviceId).to.be(ids.device);
          expect(event.eventMeta.ravelinSessionId).to.be(ids.session);
          expect(event.eventData).to.eql({
            eventName: 'paste',
            properties: {
              fieldName: 'action',
              formName: 'form-name',
              formAction: '/'
            }
          });
        }).then(done, done);
        return {status: 204};
      });

      r = new Ravelin(isolate({key: key, api: '/'}));

      var input = $('<form action=/ name="form-name"><input type=password name=action></form>')
        .appendTo(document.body)
        .find("input")[0];
      input.dispatchEvent(fakePasteEvent('text/plain', 'hello'));
    });

    it('sends empty paste events from custom sensitive fields', function(done) {
      if (!capable) this.skip();

      var key = this.test.fullTitle();
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        var event = JSON.parse(req.body);
        if (!event || !event.events || !event.events[0] || event.events[0].eventType !== 'paste') {
          return {status: 204};
        }

        // Validate the event.
        r.core.ids().then(function(ids) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'paste');
          expect(event.libVer).to.match(expectedVersion);
          expect(event.eventMeta.trackingSource).to.be('browser');
          expect(event.eventMeta.ravelinDeviceId).to.be(ids.device);
          expect(event.eventMeta.ravelinSessionId).to.be(ids.session);
          expect(event.eventData).to.eql({
            eventName: 'paste',
            properties: {
              fieldName: 'action',
              formName: 'form-name',
              formAction: '/'
            }
          });
        }).then(done, done);
        return {status: 204};
      });

      r = new Ravelin(isolate({
        key: key,
        api: '/',
        classifyPaste: function(e) {
          return {
            sensitive: e.target.hasAttribute('sensitive-data')
          };
        }
      }));

      var input = $('<form action=/ name="form-name"><input type=text name=action sensitive-data></form>')
        .appendTo(document.body)
        .find("input")[0];
      input.dispatchEvent(fakePasteEvent('text/plain', 'hello'));
    });
  });
});

/**
 * fakePasteEvent generates a ClipboardEvent as if the user pasted on the
 * browser. Not guaranteed to be the same as a real clipboard event - just
 * enough to kick our handler in.
 * @param {string} type
 * @param {string} content
 * @returns {Event}
 */
function fakePasteEvent(type, content) {
  try {
    var d = new DataTransfer();
    d.setData(type, content);
    return new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      // Firefox.
      dataType: type,
      data: content,
      // Chrome.
      clipboardData: d
    });
  } catch(e) {}

  var e = document.createEvent('CustomEvent');
  e.initEvent('paste', true, true);
  e.dataType = type;
  e.clipboardData = {
    getData: function(type) {
      return content;
    }
  };
  return e;
}

/**
 * triggerResize triggers the brower's resize event handlers in browsers that
 * support window.outerWidth.
 * @param {Number} dw Increase in window width.
 * @param {Number} dh Increase in window height.
 */
function triggerResize(dw, dh) {
  if (!window.outerWidth) {
    // IE8 doesn't support window.outerWidth, but we don't know how to
    // programmatically trigger a resize event for it anyway.
    throw new Error('triggerResize: outerWidth doesnt exist');
  }

  var ow = window.outerWidth;
  window.outerWidth += dw || 0;
  if (window.outerWidth === ow) {
    // IE9-10 don't let us artificially change outerWidth. It will always return
    // the width of the browser chrome.
    throw new Error('triggerResize: outerWidth not adjustable');
  }

  window.outerHeight += dh || 0;

  var e;
  try {
    e = new Event('resize', {bubbles: true});
  } catch(_) {
    e = window.document.createEvent('UIEvents');
    e.initUIEvent('resize', true, false, window, 0);
  }
  window.dispatchEvent(e);
}
