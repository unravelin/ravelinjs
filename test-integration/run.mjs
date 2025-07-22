import { spawn } from 'child_process';
import { startServer, stopServer } from './server.mjs';

startServer(async () => {
  let exitCode = 0;

  try {
    exitCode = await runTests();
  } catch (error) {
    console.error('Error running tests:', error);
    exitCode = 1;
  }

  console.log('Tests complete with exit code:', exitCode);

  stopServer(() => {
    process.exit(exitCode);
  });
});

function runTests() {
  return new Promise((resolve, reject) => {
    const p = spawn('npm', ['run', 'test:bs-sdk']);

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
