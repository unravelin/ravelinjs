import { setup as setupDevServer } from 'jest-dev-server';

export default async function globalSetup() {
  globalThis.servers = await setupDevServer({
    command: `node ${import.meta.dirname}/server.mjs`,
    launchTimeout: 50000,
    port: 3000,
    debug: true, // Enable console logging from server to stdout
  });
};
