describe('ravelin.core', function() {
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
