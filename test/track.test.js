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
      xhook.before(function(req) {
        r.core.id().then(function(deviceId) {
          var loadEvent = JSON.parse(req.body).events[0];
          expect(loadEvent).to.have.property('eventType', 'PAGE_LOADED');
          expect(loadEvent).to.have.property('libVer', '1.0.0-ravelinjs');
          expect(loadEvent.eventData).to.eql({eventName: 'track'});
          expect(loadEvent.eventMeta.trackingSource).to.be('browser');
          expect(loadEvent.eventMeta.ravelinDeviceId).to.be(deviceId);
        }).then(done, done);
        return {status: 204};
      });
      r = new Ravelin({key: 'hi', api: '/'});
    });
  });

  describe('#paste', function() {
    it('sends redacted paste events', function(done) {
      if (!document.createEvent) {
        this.skip(); // Not available on IE8.
      }

      xhook.before(function(req) {
        var event = JSON.parse(req.body);
        if (!event || !event.events || !event.events[0] || event.events[0].eventType !== 'paste') {
          return {status: 204};
        }

        // Validate the event.
        r.core.id().then(function(deviceId) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'paste');
          expect(event).to.have.property('libVer', '1.0.0-ravelinjs');
          expect(event.eventMeta.trackingSource).to.be('browser');
          expect(event.eventMeta.ravelinDeviceId).to.be(deviceId);
          expect(event.eventData).to.eql({
            eventName: 'paste',
            properties: {
              fieldName: 'name',
              formName: 'form-name',
              formAction: '/',
              selectionStart: 0,
              selectionEnd: 0,
              pastedValue: 'X0XX0, XXX0X.',
              panCleaned: false
            }
          });
        }).then(done, done);
        return {status: 204};
      });

      r = new Ravelin({key: 'k', api: '/'});

      var input = $('<form action=/ name="form-name"><input name=name></form>')
        .appendTo(document.body)
        .find("input")[0];
      input.dispatchEvent(fakePasteEvent('text/plain', 'h3ll0, wor1d.'));
    });

    it('sends redacted paste events of PANs', function(done) {
      if (!document.createEvent) {
        this.skip(); // Not available on IE8.
      }

      xhook.before(function(req) {
        var event = JSON.parse(req.body);
        if (!event || !event.events || !event.events[0] || event.events[0].eventType !== 'paste') {
          return {status: 204};
        }

        // Validate the event.
        r.core.id().then(function(deviceId) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'paste');
          expect(event).to.have.property('libVer', '1.0.0-ravelinjs');
          expect(event.eventMeta.trackingSource).to.be('browser');
          expect(event.eventMeta.ravelinDeviceId).to.be(deviceId);
          expect(event.eventData).to.eql({
            eventName: 'paste',
            properties: {
              fieldName: 'name',
              selectionStart: 0,
              selectionEnd: 0,
              pastedValue: '0000 0000 0000 0000',
              panCleaned: true
            }
          });
        }).then(done, done);
        return {status: 204};
      });

      r = new Ravelin({key: 'k', api: '/'});

      var input = $('<input name=name>').appendTo(document.body)[0];
      input.dispatchEvent(fakePasteEvent('text/plain', '4111 1111 1111 1111'));
    });

    it('sends empty paste events from sensitive fields', function(done) {
      if (!document.createEvent) {
        this.skip(); // Not available on IE8.
      }

      xhook.before(function(req) {
        var event = JSON.parse(req.body);
        if (!event || !event.events || !event.events[0] || event.events[0].eventType !== 'paste') {
          return {status: 204};
        }

        // Validate the event.
        r.core.id().then(function(deviceId) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'paste');
          expect(event).to.have.property('libVer', '1.0.0-ravelinjs');
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

      r = new Ravelin({key: 'k', api: '/'});

      var input = $('<form action=/ name="form-name"><input name=hello data-rvn-sensitive=true></form>')
        .appendTo(document.body)
        .find("input")[0];
      input.dispatchEvent(fakePasteEvent('text/plain', 'hello'));
    });

    it('sends empty paste events from password fields', function(done) {
      if (!document.createEvent) {
        this.skip(); // Not available on IE8.
      }

      xhook.before(function(req) {
        var event = JSON.parse(req.body);
        if (!event || !event.events || !event.events[0] || event.events[0].eventType !== 'paste') {
          return {status: 204};
        }

        // Validate the event.
        r.core.id().then(function(deviceId) {
          event = event.events[0];
          expect(event).to.have.property('eventType', 'paste');
          expect(event).to.have.property('libVer', '1.0.0-ravelinjs');
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

      r = new Ravelin({key: 'k', api: '/'});

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
