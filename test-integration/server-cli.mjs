import { startServer } from './server.mjs';

// Assign the process title from the npm script args
// This allows us to kill the process externally by name
// https://stackoverflow.com/a/33922979
process.title = process.argv[2];

startServer();
