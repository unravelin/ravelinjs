import cors from 'cors';
import express from 'express';
import mingo from 'mingo';
import onFinished from 'on-finished';
import path from 'path';
import { startTunnel } from './ngrok.mjs';

/** @type {import('node:http').Server} */
let server;
/** @type {import('@ngrok/ngrok').Listener} */
let tunnel;

/**
 * @param {() => void} [done]
 */
export function startServer(done) {
  // This Express server serves static files that will act as our test pages.
  // It also handles requests to the RavelinJS API, and logs them for test assertions.
  console.log('Starting server');

  const app = express();
  const port = 3000;
  const requests = [];

  // Serve static files from the integration test directory
  app.use(express.static(path.join(import.meta.dirname)));

  // Serve static files from the unit test directory
  app.use('/test-unit', express.static(path.join(import.meta.dirname, '../test-unit')));

  // Handle favicon requests gracefully
  app.get('/favicon.ico', (_req, res) => res.status(204).end());

  // Handle RavelinJS requests
  app.use(
    '/z',
    // Request all request bodies as text, even if Content-Type is omitted
    express.text({ type: () => true }),
    // Record the request
    function handleRequest(req, res, next) {
      const log = {
        time: new Date(),
        method: req.method,
        path: getBasePath(req),
        query: req.query,
        body: req.body,
        bodyJSON: maybeJSON(req.body),
      };
      requests.push(log);
      if (req.method === 'OPTIONS') {
        console.log(
          `Unexpected OPTIONS ${req.originalUrl} request from ${req.headers['user-agent']}`
        );
      }
      if (req.method === 'POST' && !log.bodyJSON) {
        console.log('Request with invalid JSON body:', log);
      } else if (req.path.match(/\/err/)) {
        console.log('Error request received:', log);
      } else {
        console.log('Request received:', log);
      }
      onFinished(res, () => {
        log.status = res.statusCode;
      });
      next();
    },
    // Add CORS headers, support CORS requests
    cors()
  );

  app.post('/z', noContent);
  app.post('/z/err', noContent);

  // Let tests read API requests received, optionally filtering by
  // providing a query, e.g: `?q={"url":{"$regex": "key=.+"}}`
  app.get('/requests', function handleSearch(req, res) {
    console.log('Finding requests:', {
      time: new Date(),
      query: req.query.q,
    });

    const r = !req.query.q ? requests : mingo.find(requests, JSON.parse(req.query.q)).all();
    if (r.length) {
      res.send(r);
    } else {
      res.status(204).send();
    }
  });

  // Start the server and listen for incoming requests
  server = app.listen(port, async () => {
    console.log(`Running at http://localhost:${port}`);

    // Start ngrok unless explicitly disabled
    if (process.env.NGROK_ENABLED !== 'false') {
      try {
        tunnel = await startTunnel(port);
      } catch (err) {
        // Exit and throw the error if ngrok fails to start
        await stopServer();
        throw err;
      }
    }

    if (done) {
      done(tunnel?.url());
    }
  });
}

/**
 * @param {() => void} [done]
 */
export async function stopServer(done) {
  if (tunnel) {
    try {
      console.log('Stopping ngrok');
      await tunnel.close();
    } catch (err) {
      console.error('Error stopping ngrok:', err);
    }
  }

  if (server) {
    server.close(() => {
      console.log('Server stopped');
      if (done) {
        done();
      }
    });
  } else {
    console.log('No server to stop');
    if (done) {
      done();
    }
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function noContent(req, res) {
  try {
    // Parse the request body to check it's valid
    JSON.parse(req.body);
    // Send 204 No Content
    res.status(204).send();
  } catch (err) {
    console.log('Error parsing request body:', err);
    // If parsing fails, send 400 Bad Request
    res.status(400).send(err);
  }
}

/**
 * @param {string} body
 * @returns {object | undefined}
 */
function maybeJSON(body) {
  try {
    return JSON.parse(body);
  } catch (e) {
    return undefined;
  }
}

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
function getBasePath(req) {
  return new URL(req.originalUrl, `http://${req.headers.host}`).pathname;
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping server');
  stopServer();
});
process.on('SIGINT', () => {
  console.log('SIGINT received, stopping server');
  stopServer();
});
