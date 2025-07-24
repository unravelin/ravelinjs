import { spawn } from 'child_process';
import { startServer, stopServer } from './server.mjs';

startServer(async (tunnelUrl) => {
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

function runTests(tunnelUrl) {
  return new Promise((resolve, reject) => {
    // Spawn a child process to run the BrowserStack SDK and test suite.
    // This is handled asynchronously to allow the server to run at the same time.
    const p = spawn('npm', ['run', 'test:bs-sdk'], {
      env: { ...process.env, TUNNEL_URL: tunnelUrl },
    });

    p.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    p.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
    p.on('error', (err) => {
      reject(err);
    });
    p.on('exit', (code) => {
      resolve(code);
    });
  });
}
