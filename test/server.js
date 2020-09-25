#!/usr/bin/env node

/* jshint esversion: 9, node: true */
const { parse: parseURL } = require('url');
const logger = require('@wdio/logger').default('test/server');
const buildURL = require('build-url');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const serveIndex = require('serve-index');
const ngrok = require('ngrok');
const joqular = require('joqular');

/**
 * app returns the express application of our test server.
 */
function app() {
  /** @type {RequestLog[]} */
  const requests = [];

  const app = express();

  // Return any static files.
  app.get('*', express.static(__dirname), serveIndex(__dirname, {view: 'details'}));

  // /z API.
  app.use('/z',
    // Request all request bodies as text, even if Content-Type is omitted.
    express.text({type: () => true}),
    // Record the request.
    function logRequest(req, res, next) {
      requests.push({
        time: new Date(),
        method: req.method,
        path: parseURL(req.originalUrl).pathname,
        query: req.query,
        headers: req.headers,
        body: req.body,
        bodyJSON: maybeJSON(req.body),
      });
      // Log the request.
      logger.debug('request', requests[requests.length - 1]);
      if (req.method === 'OPTIONS') {
        logger.warn(`Unexpected OPTIONS ${req.originalUrl} request from ${req.headers["user-agent"]}`);
      }
      next();
    },
    // Add CORS headers, support CORS requests.
    cors()
  );
  app.post('/z', noContent);
  app.post('/z/err', noContent);

  // Let tests read API requests received, optionally filtering by providing
  // a ?q={"url":{"$match": "/\bkey=\b/"}}, for example.
  app.get('/requests', async function logSearch(req, res) {
    const r = !req.query.q ?
      requests :
      (await joqular.query(
        JSON.parse(req.query.q),
        ...requests
      )).filter(Boolean);

    if (r.length) {
      res.send(r);
    } else {
      res.status(204).send();
    }
  });

  return app;
}

function noContent(req, res) {
  res.status(204).send();
}

function maybeJSON(b) {
  try {
    return JSON.parse(b);
  } catch(e) {}
}

/**
 * launchProxy spins up an express server behind an ngrok proxy and returns the
 * publically-accessible proxy URL. The server hosts the integration-test pages
 * and provides an API for recording and reviewing AJAX requests. This allows
 * integration tests to validate that the browser successfully made requests.
 *
 * @returns {string} The ngrok proxy address to access the server.
 */
async function launchProxy(app) {
  // Start express listening on a random port.
  var listener;
  const local = await (new Promise((resolve) => {
    listener = app.listen(0, "127.0.0.1", function() {
      // TODO: Any error handling needed here?
      resolve(listener.address());
    });
  }));

  // Spin up an ngrok tunnel pointing to our app.
  return ngrok.connect({
    addr: local.port,
    onStatusChange: function(status) {
      // Shut down the express app when ngrok is closed.
      if (status == 'closed') listener.close();
    },
  }).then(url => ({
    internal: `http://${local.address}:${local.port}`,
    internalPort: local.port,
    remote: url,
  }));
}

/**
 * disconnectProxy kills any servers started.
 * @param {string} [url] The URL of one server to kill. Defaults to all.
 */
async function disconnectProxy(url) {
  await ngrok.disconnect(url);
}

/**
 * @typedef {object} RequestLog
 * @prop {Date} time
 * @prop {string} method
 * @prop {string} path
 * @prop {object} query
 * @prop {object} headers
 * @prop {string} body
 * @prop {object} bodyJSON
 */

/**
 * expectRequest queries the app server at process.env.API to see whether any /z
 * or /z/err requests were made matching the given pattern. If no pattern is
 * provided, all requests are returned.
 *
 * It is an error for the pattern to anything other than one request.
 *
 * @param {string} api The server whose /requests we're checking.
 * @param {object} pattern A joqular query object to match {@type {RequestLog}}:
 *                         https://www.npmjs.com/package/joqular/v/2.0.4-b.
 * @returns {RequestLog} The matched request.
 */
async function expectRequest(api, pattern) {
  const q = JSON.stringify(pattern);
  const url = buildURL(api, {path: '/requests', queryParams: {q}});
  return fetch(url).then(function(res) {
    if (res.status == 204) {
      throw new Error('No recorded API requests matching ' + q);
    } else if (!res.ok) {
      throw new Error('Error fetching ' + url + ': ' + res.statusText);
    }
    return res.json();
  }).then(function(logs) {
    if (logs.length !== 1) {
      throw new Error('Expected one request matching ' + q + 'but found: ' + JSON.stringify(logs));
    }
    return logs[0];
  });
}

module.exports = { launchProxy, app, disconnectProxy, expectRequest };

if (require.main === module) {
  const a = app();
  if (process.argv.length <= 2) {
    // Launch behind ngrok.
    launchProxy(a).then(url => console.log('🚆', url));
  } else {
    // Launch on the given port.
    const port = parseInt(process.argv[2], 10);
    if (isNaN(port)) throw new Error('invalid port');
    a.listen(port, 'localhost');
    console.log('http://localhost:' + port);
  }
}
