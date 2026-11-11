import { spawn } from 'child_process';
import 'dotenv/config';
import { checkCertsExist, startServer, stopServer } from './server.mjs';

// Indicate to Selenium to use a local browser
process.env.LOCAL_BROWSER = 'true';
// Override BrowserStack config to use the local server
process.env.LOCAL_URL = 'https://localhost:3000';
// Force Selenium to download and use Chrome For Testing.
process.env.SE_FORCE_BROWSER_DOWNLOAD = 'true';

const testPath = process.argv[2];

if (!testPath) {
  console.error('Please provide a test glob pattern as the first argument.');
  process.exit(1);
}

checkCertsExist();

startServer(async tunnelUrl => {
  console.log('Tunnel URL:', tunnelUrl);
  let exitCode = 0;

  try {
    exitCode = await runTests(tunnelUrl);
  } catch (error) {
    console.error('Error running tests:', error);
    exitCode = 1;
  }

  console.log('Tests complete with exit code:', exitCode);

  stopServer(() => {
    process.exit(exitCode);
  });
});

/**
 * @param {string} tunnelUrl
 * @returns {Promise<number>}
 */
function runTests(tunnelUrl) {
  return new Promise((resolve, reject) => {
    // Spawn a child process to run the Mocha test suite.
    // This is handled asynchronously to allow the server to run at the same time.
    const p = spawn('npx', ['mocha', testPath], {
      env: { ...process.env, TUNNEL_URL: tunnelUrl },
    });

    p.stdout.on('data', data => {
      process.stdout.write(data.toString());
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
