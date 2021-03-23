describe('ravelin.core', function() {
  beforeEach(function() {
    xhook.destroy();
  });

  describe('#id', function() {
    it('can be configured with a string', function() {
      var r = new Ravelin({
        id: 'my-device-id'
      });
      return r.core.id().then(function(id) {
        expect(id).to.equal('my-device-id');
      });
    });

    it('can be configured with a Promise', function() {
      var r = new Ravelin({
        id: new Ravelin.Promise(function(resolve) {
          resolve('my-device-id');
        })
      });
      return r.core.id().then(function(id) {
        expect(id).to.equal('my-device-id');
      });
    });

    it('can be configured with a Promise that falls back to built-in IDs if empty', function() {
      var r = new Ravelin({
        id: new Ravelin.Promise(function(resolve) {
          resolve('');
        })
      });
      return r.core.id().then(function(id) {
        expect(id).to.match(/rjs-[a-z0-9-]{30,}/);
      });
    });

    it('can be configured with a Promise that falls back to built-in IDs upon errors', function() {
      var r = new Ravelin({
        id: new Ravelin.Promise(function(_, reject) {
          reject('Something went wrong.');
        })
      });
      return r.core.id().then(function(id) {
        expect(id).to.match(/rjs-[a-z0-9-]{30,}/);
      });
    });

    it('returns IDs that expire after idExpiryDays', function() {
      var r = new Ravelin({
        init: false,         // Don't persist the cookie after it expires.
        idExpiryDays: 0.0000001 // < 10ms.
      });
      return r.core.id().then(function(id) {
        expect(id).to.match(/rjs-[a-z0-9-]{30,}/);

        return new r.core.Promise(function(resolve) {
          setTimeout(resolve, 100);
        }).then(function() {
          expect(document.cookie).to.not.match(new RegExp('\\bravelinDeviceId='));
        });
      });
    });

    it('returns IDs', function() {
      var r = new Ravelin({});
      return r.core.id().then(function(id) {
        expect(id).to.match(/rjs-[a-z0-9-]{30,}/);
      });
    });

    it('keeps returning the same ID', function() {
      var r = new Ravelin({});
      return r.core.id().then(function(id1) {
        return r.core.id().then(function(id2) {
          expect(id1).to.eql(id2);
        });
      });
    });

    it('sets the ravelinDeviceId cookie', function() {
      var r = new Ravelin({});
      return r.core.id().then(function(id) {
        expect(document.cookie).to.match(new RegExp('\\bravelinDeviceId=' + id + '\\b'));
      });
    });

    it('reinstates an ID removed from cookies', function() {
      var r1 = new Ravelin({
        syncMs: 5
      });
      return r1.core.id().then(function(id1) {
        // Take the ID out of the cookies. This is the only time that we should
        // clear the cookies, because there may have been other Ravelin
        // instances created that are attempting to restore their deviceId in
        // the cookies.
        // TODO: Can we r.core._stop()?
        var cookies = document.cookie.split(";");
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i];
            var eqPos = cookie.indexOf("=");
            var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }

        // Wait a second.
        return new r1.core.Promise(function(resolve) {
          setTimeout(resolve, 300);
        }).then(function() {
          var r2 = new Ravelin({});
          return r2.core.id().then(function(id2) {
            expect(id1).to.eql(id2);
          });
        });
      });
    });
  });

  describe('#Core', function() {
    $([
      {key: 'pk_live_123', api: '/', expApi: '/'},
      {key: 'pk_live_123', api: '////', expApi: '/'},
      {key: 'pk_test_123', api: '/root/', expApi: '/root'},
      {key: 'pk_live_123', api: 'rel/', expApi: 'rel'}
    ]).each(function(n, test) {
      it('respects explicit api in test = ' + JSON.stringify(test), function() {
        xhook.before(function(r) {
          return {status: 204};
        });
        var r = new Ravelin({
          init: false,
          key: test.key,
          api: test.api
        });
        expect(r.core.api).to.be(test.expApi);
      });
    });

    $([
      {key: 'publishable_key_test_123', api: '', expApi: 'https://live.ravelin.click'},
      {key: 'publishable_key_test_123', expApi: 'https://live.ravelin.click'},
      {key: 'publishable_key_live_123', expApi: 'https://live.ravelin.click'},
      {key: 'publishable_key_test_live_123', expApi: 'https://live.ravelin.click'},
      {key: 'publishable_key_env_123', expApi: 'https://env.ravelin.click'},
      {key: 'publishable_key_test_env_123', expApi: 'https://env.ravelin.click'}
    ]).each(function(n, test) {
      it('infers url from key in test = ' + JSON.stringify(test), function() {
        var r = new Ravelin({
          key: test.key,
          api: test.api
        });
        expect(r.core.api).to.be(test.expApi);
      });
    });
  });

  describe('#send', function() {
    it('returns a rejected promise for bad bodies', function() {
      // Create b with a cyclical reference to itself, which will fail to stringify.
      var b = {};
      b.b = b;

      // Try to serialise b in a request.
      var r = new Ravelin({key: 'k', api: '/'});
      try {
        return r.core.send('POST', 'z', b)
          .then(
            function(r) {
              throw new Error('Expected an error but got result: ' + JSON.stringify(r));
            },
            function(e) {
              expect(e).to.be.a(TypeError);
            }
          );
      } catch (e) {
        throw new Error('Expected failed promise but caught exception: ' + e.message);
      }
    });

    it('wont retry unknown errors', function() {
      xhook.before(function(r) {
        throw new Error('not retried');
      });
      var r = new Ravelin({key: 'k', api: '/'});
      return r.core.send('POST', 'z', {}).
        then(
          function pass(r) {
            throw new Error('Exception expected but got result ' + JSON.stringify(r));
          },
          function fail(err) {
            expect(err).to.be.an(Error);
            expect(err.message).to.eql('not retried');
          }
        );
    });

    it('retries 500s', function() {
      var failures = 0;
      xhook.before(function(req) {
        if (failures < 1) {
          failures++;
          return {status: 500};
        }
        return {status: 204};
      });
      var rav = new Ravelin({
        api: '/',
        key: 'retries'
      });
      return rav.core.send('POST', 'z', {
        retryTest: 'hello'
      }).then(function(r) {
        expect(r).to.eql({
          status: 204,
          attempt: 2,
          text: ""
        });
      });
    });

    it('retries 500s at most 3 times', function() {
      xhook.before(function(req) {
        return {status: 500};
      });
      var rav = new Ravelin({
        api: '/',
        key: 'retries'
      });
      return rav.core.send('POST', 'z', {
        retryTest: 'hello'
      }).then(
        function (r) {
          throw r;
        },
        function(r) {
          expect(r).to.eql({
            status: 500,
            attempt: 3,
            text: ""
          });
        }
      );
    });
  });
});
