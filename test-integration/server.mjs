import express from 'express';
import path from 'path';
import cors from 'cors';
import onFinished from 'on-finished';

let server;

export function startServer(done) {
  // This Express server serves static files that will act as our test pages.
  // It also handles requests to the RavelinJS API, and logs them for test assertions.
  console.log('Starting server');

  const app = express();
  const port = 3000;
  const requests = [];

  // Serve static files from the test directory
  app.use(express.static(path.join(import.meta.dirname)));

  // Handle RavelinJS requests
  app.use(
    '/z',
    // Request all request bodies as text, even if Content-Type is omitted
    express.text({ type: () => true }),
    // Record the request
    function logRequest(req, res, next) {
      const log = {
        time: new Date(),
        method: req.method,
        path: req.originalUrl,
        query: req.query,
        headers: req.headers,
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

  // Start the server and listen for incoming requests
  server = app.listen(port, () => {
    console.log('Running at http://localhost:3000');
    if (done) {
      done();
    }
  });
}

export function stopServer(done) {
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

function maybeJSON(body) {
  try {
    return JSON.parse(body);
  } catch (e) {
    return undefined;
  }
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping server');
  stopServer();
});
process.on('SIGINT', () => {
  console.log('SIGINT received, stopping server');
  stopServer();
});
