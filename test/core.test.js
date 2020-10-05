describe('ravelin.core', function() {
  beforeEach(function() {
    xhook.destroy();
  });
  before(function() {
    deleteAllCookies();
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

  it('reinstates an ID removed from cookies', function() {
    var r1 = new Ravelin({
      syncMS: 30
    });
    return r1.core.id().then(function(id1) {
      // Take the ID out of the cookies.
      deleteAllCookies();

      // Wait a second.
      return new r1.core.Promise(function(resolve) {
        setTimeout(resolve, 100);
      }).then(function() {
        var r2 = new Ravelin({});
        return r2.core.id().then(function(id2) {
          expect(id1).to.eql(id2);
        });
      });
    });
  });

  describe('#key', function() {
    var tests = [
      {key: 'pk_test_123', url: 'https://ravelin.click/'},
      {key: 'pk_live_123', url: 'https://ravelin.click/'},
      {key: 'publishable_key_test_123', url: 'https://ravelin.click/'},
      {key: 'publishable_key_live_123', url: 'https://ravelin.click/'},
      {key: 'publishable_key_hello_123', url: 'https://hello.ravelin.click/'},
      {key: 'publishable_key_test_hello_123', url: 'https://hello.ravelin.click/'}
    ];
    for (var i = 0; i < tests.length; i++) {
      (function(test) {
        it('infers API ' + test.api + ' from key ' + test.key, function() {
          xhook.before(function(req) {
            expect(req.url).to.be(test.url + '?key=' + test.key);
            return {status: 204, text: ""};
          });
          var r = new Ravelin({key: test.key});
          return r.core.send('POST', '/', {hi: true});
        });
      })(tests[i]);
    }
  });

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
            expect(e.message).to.match(/json/i);
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

function deleteAllCookies() {
  var cookies = document.cookie.split(";");
  for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i];
      var eqPos = cookie.indexOf("=");
      var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}
