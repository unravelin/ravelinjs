import express from 'express';
import path from 'path';

let server;

export function startServer(done) {
  // This Express server serves static files that will act as our test pages
  console.log('Starting server');

  const app = express();
  const port = 3000;

  // Serve static files from the test directory
  app.use(express.static(path.join(import.meta.dirname)));

  // Add a catch-all route to serve index.html for any other request that doesn't have an extension.
  // For example, a request to /foo will serve the /foo/index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, 'index.html'));
  });

  // Handle RavelinJS requests
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
    // If parsing fails, send 400 Bad Request
    res.status(400).send(err);
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
