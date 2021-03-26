/* globals isolate */

describe('ravelin.core', function() {
  beforeEach(function() {
    xhook.destroy();

    // Delete all cookies. The tests should be fully isolated anyway, but this
    // makes the error output cleaner.
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i];
      var eqPos = cookie.indexOf("=");
      var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  });

  describe('#id', function() {
    it('can be configured with a string', function() {
      var r = new Ravelin(isolate({
        cookie: 'unused',
        id: 'my-device-id'
      }));
      return r.core.id().then(function(id) {
        expect(id).to.equal('my-device-id');
        expect(r.core.cookies.get('unused')).to.be(undefined);
      });
    });

    it('can be configured with a Promise', function() {
      var r = new Ravelin(isolate({
        cookie: 'unused',
        id: new Ravelin.Promise(function(resolve) {
          resolve('my-device-id');
        })
      }));
      return r.core.id().then(function(id) {
        expect(id).to.equal('my-device-id');
        expect(r.core.cookies.get('unused')).to.be(undefined);
      });
    });

    it('can be configured with a Promise that falls back to built-in IDs if empty', function() {
      var r = new Ravelin(isolate({
        cookie: 'id-empty-promise',
        id: new Ravelin.Promise(function(resolve) {
          resolve('');
        })
      }));
      return r.core.id().then(function(id) {
        expect(id).to.match(/rjs-[a-z0-9-]{30,}/);
        expect(r.core.cookies.get('id-empty-promise')).to.equal(id);
      });
    });

    it('can be configured with a Promise that falls back to built-in IDs upon errors', function() {
      var r = new Ravelin(isolate({
        cookie: 'id-error-promise',
        id: new Ravelin.Promise(function(_, reject) {
          reject('Something went wrong.');
        })
      }));
      return r.core.id().then(function(id) {
        expect(id).to.match(/rjs-[a-z0-9-]{30,}/);
        expect(r.core.cookies.get('id-error-promise')).to.equal(id);
      });
    });

    it('returns IDs that expire after cookieExpiryDays', function() {
      this.timeout(2500);
      function msToDays(ms) { return ms / (86400 * 1000); }

      // This test must happen before other Ravelin instances start persisting a
      // cookie.
      var r = new Ravelin(isolate({
        cookie: 'expiredDeviceId',
        syncMs: 10000,

        // Expiry times are formatted with second granularity, so it's hard to
        // make this quicker. Is it safe to change?
        cookieExpiryDays: msToDays(1500)
      }));
      return r.core.id().then(function(id) {
        expect(id).to.match(/rjs-[a-z0-9-]{30,}/);
        expect(r.core.cookies.get('expiredDeviceId')).to.be(id);

        return new r.core.Promise(function(resolve) {
          setTimeout(resolve, 2000);
        }).then(function() {
          expect(r.core.cookies.get('expiredDeviceId')).to.be(undefined);
        });
      });
    });

    it('returns IDs', function() {
      var r = new Ravelin(isolate({}));
      return r.core.id().then(function(id) {
        expect(id).to.match(/rjs-[a-z0-9-]{30,}/);
      });
    });

    it('keeps returning the same ID', function() {
      var r = new Ravelin(isolate({}));
      return r.core.id().then(function(id1) {
        return r.core.id().then(function(id2) {
          expect(id1).to.eql(id2);
        });
      });
    });

    it('sets the ravelinDeviceId cookie by default', function() {
      var r = new Ravelin(isolate({
        cookie: 'ravelinDeviceId'
      }));
      return r.core.id().then(function(id) {
        expect(document.cookie).to.match(new RegExp('\\bravelinDeviceId=' + id + '\\b'));
        expect(r.core.cookies.get('ravelinDeviceId')).to.be(id); // Test our cookie getter works!
      });
    });

    it('sets a customisable cookie', function() {
      var r = new Ravelin(isolate({
        cookie: 'custom-guid'
      }));
      return r.core.id().then(function(id) {
        expect(document.cookie).to.match(new RegExp('\\bcustom-guid=' + id + '\\b'));
      });
    });

    it('reinstates an ID removed from cookies', function() {
      var cfg = isolate({
        cookie: 'removed-cookie',
        syncMs: 10
      });
      var r1 = new Ravelin(cfg);
      return r1.core.id().then(function(id1) {
        // Remove the cookie.
        r1.core.cookies.set({
          name: 'removed-cookie',
          value: 'unset',
          expires: new Date(new Date().getTime() - 10000)
        });
        expect(r1.core.cookies.get('removed-cookie')).to.be(undefined);
        expect(document.cookie).to.not.match(/\bremoved-cookie=\b/);

        // Wait for the sync to reoccur..
        return new Ravelin.Promise(function(resolve) {
          setTimeout(resolve, 300);
        }).then(function() {
          var r2 = new Ravelin(cfg);
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
        var r = new Ravelin(isolate({
          init: false,
          key: test.key,
          api: test.api
        }));
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
        var r = new Ravelin(isolate({
          key: test.key,
          api: test.api
        }));
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
      var r = new Ravelin(isolate({key: 'k', api: '/'}));
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
      var r = new Ravelin(isolate({key: 'k', api: '/'}));
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
      var rav = new Ravelin(isolate({
        api: '/',
        key: 'retries'
      }));
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
      var rav = new Ravelin(isolate({
        api: '/',
        key: 'retries'
      }));
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
