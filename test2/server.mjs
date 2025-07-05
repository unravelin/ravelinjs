import express from 'express';
import path from 'path';

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
const server = app.listen(port, () => {
  console.log('Running at http://localhost:3000');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing server');
  server.close(() => {
    console.log('Server closed');
  });
});

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
