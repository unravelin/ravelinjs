/* jshint esversion: 9, node: true */
const express = require('express');
const ngrok = require('ngrok');
const serveIndex = require('serve-index');

/**
 * launchServer spins up an express server behind an ngrok proxy and returns the
 * publically-accessible proxy URL. The server hosts the integration-test pages
 * and provides an API for recording and reviewing AJAX requests. This allows
 * integration tests to validate that the browser successfully made requests.
 *
 * @returns {string} The ngrok proxy address to access the server.
 */
async function launchServer() {
  // Host the files through express.
  const app = express();
  app.use(express.static(__dirname), serveIndex(__dirname, {view: 'details'}));

  // Start express listening on a random port.
  var listener;
  const port = await (new Promise((resolve) => {
    listener = app.listen(0, "127.0.0.1", function() {
      // TODO: Any error handling needed here?
      resolve(listener.address().port);
    });
  }));

  // Spin up an ngrok tunnel pointing to our app.
  return ngrok.connect({
    addr: port,
    onStatusChange: function(status) {
      // Shut down the express app when ngrok is closed.
      if (status == 'closed') listener.close();
    },
  });
}

/**
 * haltServer kills any servers started.
 * @param {string} [url] The URL of one server to kill. Defaults to all.
 */
async function haltServer(url) {
  await ngrok.disconnect(url);
}

module.exports = { launchServer, haltServer };

if (require.main === module) {
  launchServer().then(url => console.log('🚆 ' + url));
}
