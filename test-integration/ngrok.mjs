import ngrok from '@ngrok/ngrok';
import { setTimeout } from 'timers/promises';

const retryDelay = 2000;

// Enable ngrok console logging
ngrok.consoleLog('WARN');

/**
 * Starts an ngrok connection to expose our local server on the specified port.
 * Retries if it fails to start, up to a maximum number of attempts.
 * This is used to test RavelinJS integration with API URLs that are not on the same domain.
 *
 * @param {number} port - The port to expose.
 * @param {number} [maxRetries=3] - The maximum number of retry attempts.
 * @returns {Promise<ngrok.Listener>} - A promise that resolves to the ngrok listener object.
 * @throws {Error} - Throws an error if the tunnel fails to start after all attempts.
 */
export async function startTunnel(port, maxRetries = 3) {
  console.log('Starting ngrok');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const tunnel = await ngrok.forward({ addr: port, authtoken_from_env: true });

      console.log(`ngrok tunnel established at ${tunnel.url()}`);

      return tunnel;
    } catch (err) {
      console.error(`Attempt ${i + 1} failed:`, err);

      if (i < maxRetries - 1) {
        console.log(`Retrying in ${retryDelay}ms…`);
        await setTimeout(retryDelay);
      } else {
        throw new Error('Failed to start ngrok after all attempts');
      }
    }
  }
}
