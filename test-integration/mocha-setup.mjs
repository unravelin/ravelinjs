import { startServer, stopServer } from '../test2/server.mjs';

export const mochaHooks = {
  beforeAll(done) {
    startServer(done);
  },
  afterAll(done) {
    console.log('Tests complete, stopping server');
    stopServer(done);
  },
};
