#!/usr/bin/env node
import { realpathSync } from "fs";
import { pathToFileURL } from "url";

/* jshint esversion: 9, node: true */
import { parse as parseURL } from 'node:url';
import onFinished from 'on-finished';
import wdioLog from '@wdio/logger';
import buildURL from 'build-url';
import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';
import serveIndex from 'serve-index';
import ngrok from 'ngrok';
import mingo from 'mingo';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const logger = wdioLog('test/server');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * app returns the express application of our test server.
 */
export function app() {
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
      const log = {
        time: new Date(),
        method: req.method,
        path: parseURL(req.originalUrl).pathname,
        query: req.query,
        headers: req.headers,
        body: req.body,
        bodyJSON: maybeJSON(req.body),
      };
      requests.push(log);
      if (req.method === 'OPTIONS') {
        logger.warn(`Unexpected OPTIONS ${req.originalUrl} request from ${req.headers["user-agent"]}`);
      }
      if (req.method === 'POST' && !log.bodyJSON) {
        logger.warn('request with invalid JSON body', log);
      } else if (req.path.match(/\/err/)) {
        logger.warn('error request', log);
      } else {
        logger.info('request', log);
      }
      onFinished(res, function() {
        log.status = res.statusCode;
      });
      next();
    },
    // Add CORS headers, support CORS requests.
    cors()
  );
  app.post('/z', noContent);
  app.post('/z/err', noContent);

  // Let tests read API requests received, optionally filtering by providing
  // a ?q={"url":{"$regex": "key="}}, for example.
  app.get('/requests', async function logSearch(req, res) {
    const r = !req.query.q ?
        requests :
        mingo.find(requests, JSON.parse(req.query.q)).all();
    if (r.length) {
      res.send(r);
    } else {
      res.status(204).send();
    }
  });

  return app;
}

export function noContent(req, res) {
  try {
    JSON.parse(req.body);
    res.status(204).send();
  } catch(e) {
    res.status(400).send(e);
  }
}

export function maybeJSON(b) {
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
 * @param {express.Application} app
 * @param {Number} [port]
 * @param {Boolean} [withNgrok]
 * @returns {string} The ngrok proxy address to access the server.
 */
export async function launchProxy(app, port, withNgrok=true) {
  // Start express listening on a random port.
  var listener;
  const local = await (new Promise((resolve) => {
    listener = app.listen(port, "127.0.0.1", function() {
      // TODO: Any error handling needed here?
      resolve(listener.address());
    });
  }));

  // Spin up an ngrok tunnel pointing to our app.
  const n = (withNgrok !== false)
    ? ngrok.connect({
      authtoken: process.env.NGROK_AUTH_TOKEN,
      addr: local.port,
      onLogEvent: msg => logger.info('ngrok:', msg),
      onStatusChange: function(status) {
        // Shut down the express app when ngrok is closed.
        if (status == 'closed') listener.close();
      }
    })
    : Promise.resolve(null);

  return n.then(url => ({
    internal: `http://${local.address}:${local.port}`,
    internalPort: local.port,
    remote: url,
  }));
}

/**
 * disconnectProxy kills any servers started.
 * @param {string} [url] The URL of one server to kill. Defaults to all.
 */
export async function disconnectProxy(url) {
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
 * fetchRequest queries the app server at process.env.API to see whether any /z
 * or /z/err requests were made matching the given pattern. If no pattern is
 * provided, all requests are returned.
 *
 * It is an error for the pattern to anything other than one request.
 *
 * @param {string} api The server whose /requests we're checking.
 * @param {object} pattern A mingo query object https://github.com/kofrasa/mingo.
 * @returns {RequestLog} The matched request.
 */
export async function fetchRequest(api, pattern) {
  const q = JSON.stringify(pattern);
  const url = buildURL(api, {path: '/requests', queryParams: {q}});
  return fetch(url).then(function(res) {
    if (res.status == 204) {
      throw new EmptyFetchError(pattern);
    } else if (!res.ok) {
      throw new Error('Error fetching ' + url + ': ' + res.statusText);
    }
    return res.json();
  }).then(function(logs) {
    if (!logs.length) {
      throw new EmptyFetchError(pattern);
    }
    return logs[0];
  });
}

class EmptyFetchError extends Error {
  constructor(q) {
    super(`Found no requests matching ${JSON.stringify(q)}`);
    this.q = q;
  }
}

export async function expectNoRequest(api, pattern) {
  let r;
  try {
    r = await fetchRequest(api, pattern);
  } catch (e) {
    if (e instanceof EmptyFetchError) {
      return;
    }
    throw e;
  }
  throw new NonemptyFetchError(r, pattern);
}

class NonemptyFetchError extends Error {
  constructor(r, q) {
    super(`Found unexpected request matching ${JSON.stringify(q)}`);
    this.r = r;
    this.q = q;
  }
}

export async function expectNoError(api, key) {
  try {
    await expectNoRequest(api, {
      'path': '/z/err',
      'query.key': key,
    });
  } catch (e) {
    if (e instanceof NonemptyFetchError) {
      const err = e.r.bodyJSON;
      let m = err.message;
      if (err.type) m = err.type + ': ' + m;
      if (err.stack) m += "\nStack: " + err.stack;
      throw new Error(m);
    }
    throw e;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
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
