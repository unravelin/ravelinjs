/**
 * @fileoverview Detects an attached Chrome DevTools Protocol (CDP) client, which
 * underpins Puppeteer, Playwright-Chromium, and ChromeDriver. Unlike the
 * per-framework detectors, this looks for a runtime *behaviour* rather than
 * injected globals, so it catches those tools as a class even when they leak no
 * page-visible artifacts.
 *
 * The probe relies on the fact that when a CDP client has the `Runtime` domain
 * enabled, the browser eagerly serialises arguments passed to the `console` API
 * to forward them over the protocol. Serialising an `Error` reads its `.stack`,
 * so a getter installed on `.stack` fires only when such a client is listening.
 */

import { PRECEDENCE } from '../precedence.ts';

/**
 * Detects browser automation that speaks the Chrome DevTools Protocol.
 */
export default class CDPDetector implements detection.Detector {
  public readonly signal = 'cdp';
  public readonly precedence = PRECEDENCE.DRIVER;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    this._detectConsoleSerialization();

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }

  /**
   * Logs an `Error` whose `.stack` is a getter; the getter only runs if a CDP
   * client serialises the console argument.
   */
  private _detectConsoleSerialization(): void {
    const consoleObj = this.env.console;
    const log = consoleObj?.debug ?? consoleObj?.log;
    if (typeof log !== 'function') {
      return;
    }

    let serialized = false;
    try {
      const probe = new Error();
      Object.defineProperty(probe, 'stack', {
        configurable: true,
        get: () => {
          serialized = true;
          return '';
        },
      });
      log.call(consoleObj, probe);
    } catch {
      // If the probe throws, treat it as inconclusive rather than positive.
      return;
    }

    if (serialized) {
      this.indicators.push('console-serialization');
    }
  }
}
