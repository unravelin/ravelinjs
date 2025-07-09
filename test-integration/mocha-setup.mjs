import { startServer, stopServer } from './server.mjs';

export const mochaHooks = {
  beforeAll(done) {
    startServer(done);
  },
  afterAll(done) {
    console.log('Tests complete, stopping server');
    stopServer(done);
  },
};
