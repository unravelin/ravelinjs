import localtunnel from 'localtunnel';
import { setTimeout } from 'timers/promises';

const retryDelay = 2000;

/**
 * Starts a localtunnel to expose our local server on the specified port.
 * Retries if it fails to start, up to a maximum number of attempts.
 * This is used to test RavelinJS integration with API URLs that are not on the same domain.
 *
 * @param {number} port - The port to expose.
 * @param {number} [maxRetries=3] - The maximum number of retry attempts.
 * @returns {Promise<localtunnel.Tunnel>} - The localtunnel instance.
 * @throws {Error} - Throws an error if the tunnel fails to start after all attempts.
 */
export async function startTunnel(port, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const tunnel = await localtunnel({ port });

      console.log(`Localtunnel started at: ${tunnel.url}`);

      tunnel.on('close', () => {
        console.log('Localtunnel closed');
      });

      tunnel.on('error', (err) => {
        console.error('Localtunnel error:', err);
      });

      return tunnel;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message || error);

      if (i < maxRetries - 1) {
        console.log(`Retrying in ${retryDelay}ms...`);
        await setTimeout(retryDelay);
      } else {
        throw new Error('Failed to start localtunnel after all attempts');
      }
    }
  }
}
