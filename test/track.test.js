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

        r.core.id().then(function(deviceId) {
          var loadEvent = JSON.parse(req.body).events[0];
          expect(loadEvent).to.have.property('eventType', 'PAGE_LOADED');
          expect(loadEvent).to.have.property('libVer', '1.0.0-rc1-ravelinjs');
          expect(loadEvent.eventData).to.eql({eventName: 'track'});
          expect(loadEvent.eventMeta.trackingSource).to.be('browser');
          expect(loadEvent.eventMeta.ravelinDeviceId).to.be(deviceId);
        }).then(done, done);
        return {status: 204};
      });
      r = new Ravelin({key: key, api: '/'});
    });
  });

  describe('#paste', function() {
    // IE8 doesn't support createEvent or paste handling at all.
    var capable = !!document.createEvent;
    // Safari is difficult to craft a paste event for?
    var capableContent = !!fakePasteEvent('text/plain', 'test').clipboardData;

    it('sends redacted paste events', function(done) {
      if (!capable) this.skip();

      var key = this.test.fullTitle();
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        var event = JSON.parse(req.body);
        if (!event || !event.events || !event.events[0] || event.events[0].eventType !== 'paste') {
          return {status: 204};
        }

        var props = {
          fieldName: 'name',
          formName: 'form-name',
          formAction: '/',
          selectionStart: 0,
          selectionEnd: 0
        };
        if (capableContent) {
          props.pastedValue = 'X0XX0, XXX0X.';
          props.panCleaned = false;
        }

        // Validate the event.
        r.core.id().then(function(deviceId) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'paste');
          expect(event).to.have.property('libVer', '1.0.0-rc1-ravelinjs');
          expect(event.eventMeta.trackingSource).to.be('browser');
          expect(event.eventMeta.ravelinDeviceId).to.be(deviceId);
          expect(event.eventData).to.eql({
            eventName: 'paste',
            properties: props
          });
        }).then(done, done);
        return {status: 204};
      });

      r = new Ravelin({key: key, api: '/'});

      var input = $('<form action=/ name="form-name"><input name=name></form>')
        .appendTo(document.body)
        .find("input")[0];
      input.dispatchEvent(fakePasteEvent('text/plain', 'h3ll0, wor1d.'));
    });

    $([
      {paste: '4234 5678 901', pastedValue: '0000 0000 000', panCleaned: false},
      {paste: '4234 5678 9012', pastedValue: '0000 0000 0000', panCleaned: true},
      {paste: '4234 5678 9012 3', pastedValue: '0000 0000 0000 0', panCleaned: true},
      {paste: '4234 5678 9012 34', pastedValue: '0000 0000 0000 00', panCleaned: true},
      {paste: '4234 5678 9012 345', pastedValue: '0000 0000 0000 000', panCleaned: true},
      {paste: '4234 5678 9012-3456', pastedValue: '0000 0000 0000-0000', panCleaned: true},
      {paste: '4234 5678-9012 3456 7', pastedValue: '0000 0000-0000 0000 0', panCleaned: false},
      {paste: '4234 5678 9012 3456 78', pastedValue: '0000 0000 0000 0000 00', panCleaned: false},
      {paste: '4234 5678 9012 3456 789', pastedValue: '0000 0000 0000 0000 000', panCleaned: false}
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

          var props = {
            fieldName: 'name',
            selectionStart: 0,
            selectionEnd: 0
          };
          if (capableContent) {
            props.pastedValue = test.pastedValue;
            props.panCleaned = test.panCleaned;
          }

          // Validate the event.
          r.core.id().then(function(deviceId) {
            event = event.events[0];
            expect(event).to.have.property('eventType', 'paste');
            expect(event).to.have.property('libVer', '1.0.0-rc1-ravelinjs');
            expect(event.eventMeta.trackingSource).to.be('browser');
            expect(event.eventMeta.ravelinDeviceId).to.be(deviceId);
            expect(event.eventData).to.eql({
              eventName: 'paste',
              properties: props
            });
          }).then(done, done);
          return {status: 204};
        });

        r = new Ravelin({key: key, api: '/'});

        var input = $('<input name=name>').appendTo(document.body)[0];
        input.dispatchEvent(fakePasteEvent('text/plain', test.paste));
      });
    });

    it('shouldnt treat 19-digit numbers as PANs', function(done) {
      if (!capable) this.skip();

      var key = this.test.fullTitle();
      xhook.before(function(req) {
        if (!keysMatch(req, key)) return {status: 204};

        var event = JSON.parse(req.body);
        if (!event || !event.events || !event.events[0] || event.events[0].eventType !== 'paste') {
          return {status: 204};
        }

        var props = {
          fieldName: 'name',
          selectionStart: 0,
          selectionEnd: 0
        };
        if (capableContent) {
          props.pastedValue = '0000 0000 0000 0000 000';
          props.panCleaned = false;
        }

        // Validate the event.
        r.core.id().then(function(deviceId) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'paste');
          expect(event).to.have.property('libVer', '1.0.0-rc1-ravelinjs');
          expect(event.eventMeta.trackingSource).to.be('browser');
          expect(event.eventMeta.ravelinDeviceId).to.be(deviceId);
          expect(event.eventData).to.eql({
            eventName: 'paste',
            properties: props
          });
        }).then(done, done);
        return {status: 204};
      });

      r = new Ravelin({key: key, api: '/'});

      var input = $('<input name=name>').appendTo(document.body)[0];
      input.dispatchEvent(fakePasteEvent('text/plain', '4111 1111 1111 1111 123'));
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
        r.core.id().then(function(deviceId) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'paste');
          expect(event).to.have.property('libVer', '1.0.0-rc1-ravelinjs');
          expect(event.eventMeta.trackingSource).to.be('browser');
          expect(event.eventMeta.ravelinDeviceId).to.be(deviceId);
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

      r = new Ravelin({key: key, api: '/'});

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
        r.core.id().then(function(deviceId) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'paste');
          expect(event).to.have.property('libVer', '1.0.0-rc1-ravelinjs');
          expect(event.eventMeta.trackingSource).to.be('browser');
          expect(event.eventMeta.ravelinDeviceId).to.be(deviceId);
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

      r = new Ravelin({key: key, api: '/'});

      var input = $('<form action=/ name="form-name"><input type=password name=action></form>')
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
