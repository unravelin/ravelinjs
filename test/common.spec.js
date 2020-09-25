/* jshint esversion: 9, node: true, browser: false */

/**
 * navigate attempts to load a page with title containing titleSubstr from any
 * of the URLs listed, in order. Useful in-case you're loading the page over a
 * flakey tunnel and the location of the page isn't hugely important.
 *
 * @param {wdio.Browser} browser
 * @param {string} titleSubstr
 * @param  {...string} urls
 */
function navigate(browser, titleSubstr, ...urls) {
  var errs = [];
  for (var i = 0; i < urls.length; i++) {
    browser.url(urls[i]);
    var title;
    try {
      // Confirm that the page loaded with the title we expected.
      browser.waitUntil(function() {
        title = browser.getTitle();
        if (title.indexOf(titleSubstr) !== -1) {
          throw new Error('mismatched title');
        }
        return true;
      });
      return;
    } catch (e) {
      if (e.message === 'mismatched title') {
        // Either the titles don't match or the page didn't load.
        errs.push(`${urls[i]}: ${title}`);
      } else {
        throw e;
      }
    }
  }
  throw new Error(`No pages had title matching substring ${titleSubstr}: ${errs.join(";")}`);
}

exports = {
  navigate,
};
