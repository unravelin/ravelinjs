import { execSync } from 'child_process';
import { startServer, stopServer } from './server.mjs';

startServer(() => {
  let exitCode = 0;

  try {
    execSync('npm run test:bs-sdk', { stdio: 'inherit' });
  } catch (error) {
    if (error.status !== 0) {
      exitCode = error.status;
    }
  }

  console.log('Tests complete with exit code:', exitCode);

  stopServer(() => {
    process.exit(exitCode);
  });
});
