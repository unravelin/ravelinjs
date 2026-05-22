import 'dotenv/config';
import { spawn } from 'child_process';
import { buildBrowserStackConfig } from './build-bstack-config.mjs';
import { updateCommitStatus } from './ci.mjs';
import { checkCertsExist, startServer, stopServer } from './server.mjs';

const logs = [];
const testPath = process.argv[2];

if (!testPath) {
  console.error('Please provide a test glob pattern as the first argument.');
  process.exit(1);
}

checkCertsExist();

buildBrowserStackConfig();

startServer(async tunnelUrl => {
  let exitCode = 0;

  try {
    exitCode = await runTests(tunnelUrl);
  } catch (error) {
    console.error('Error running tests:', error);
    exitCode = 1;
  }

  console.log('Tests complete with exit code:', exitCode);

  stopServer(async () => {
    await updateCommitStatus(logs);

    process.exit(exitCode);
  });
});

/**
 * @param {string} tunnelUrl
 * @returns {Promise<number>}
 */
function runTests(tunnelUrl) {
  return new Promise((resolve, reject) => {
    // Spawn a child process to run the BrowserStack SDK and test suite.
    // This is handled asynchronously to allow the server to run at the same time.
    const p = spawn('npm', ['run', 'test:bstack-sdk', '--', testPath], {
      env: { ...process.env, TUNNEL_URL: tunnelUrl },
    });

    p.stdout.on('data', data => {
      const log = data.toString();
      logs.push(log);
      process.stdout.write(log);
    });
    p.stderr.on('data', data => {
      process.stderr.write(data.toString());
    });
    p.on('error', err => {
      reject(err);
    });
    p.on('exit', code => {
      resolve(code);
    });
  });
}
