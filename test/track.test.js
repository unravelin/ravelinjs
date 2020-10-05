describe('ravelin.track', function() {
  beforeEach(function() {
    xhook.destroy();
  });

  describe('#load', function() {
    it('sends upon instantiation', function(done) {
      var r;
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
    it('sends paste content', function(done) {
      if (!document.createEvent) {
        this.skip(); // Not available on IE8.
      }

      var r;
      xhook.before(function(req) {
        var event = JSON.parse(req.body).events[0];
        if (event.eventType !== 'paste') {
          return {status: 204};
        }
        xhook.destroy();

        // Validate the event.
        r.core.id().then(function(deviceId) {
          expect(event).to.have.property('eventType', 'paste');
          expect(event).to.have.property('libVer', '1.0.0-ravelinjs');
          expect(event.eventMeta.trackingSource).to.be('browser');
          expect(event.eventMeta.ravelinDeviceId).to.be(deviceId);
          expect(event.eventData).to.eql({
            eventName: 'paste',
            properties: {
              fieldName: 'hello',
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

      var input = document.body.appendChild(document.createElement('input'));
      input.name = 'hello';
      input.dispatchEvent(fakePasteEvent('text/plain', 'h3ll0, wor1d.'));
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
