/**
 * @fileoverview Detects Selenium/WebDriver artifacts, such as the globals its
 * language bindings inject into the page, the properties it leaks onto the
 * document, and user-agent markers left by some configurations. ChromeDriver's
 * own fingerprints (the `$cdc_…` keys) are handled by the ChromeDriver detector.
 */

import { PRECEDENCE } from '../precedence';

// NOTE: The following lists are kept separate in case we add a confidence score
// in the future.

/**
 * Globals that Selenium and its WebDriver bindings expose on the page's
 * `window`/`globalThis`. These are strong, direct evidence of a Selenium-driven
 * runtime.
 */
const SELENIUM_GLOBALS = [
  '_selenium',
  '_Selenium_IDE_Recorder',
  '_WEBDRIVER_ELEM_CACHE',
  '__selenium_unwrapped',
  '__selenium_evaluate',
  '__webdriver_evaluate',
  '__webdriver_unwrapped',
  '__webdriver_script_fn',
  '__webdriver_script_func',
  '__webdriver_script_function',
  '__driver_evaluate',
  '__driver_unwrapped',
  '__fxdriver_evaluate',
  '__fxdriver_unwrapped',
  '__$webdriverAsyncExecutor',
];

/** Properties Selenium leaks onto the document object. */
const SELENIUM_DOCUMENT_ARTIFACTS = [
  '__selenium_unwrapped',
  '__selenium_evaluate',
  '__webdriver_evaluate',
  '__webdriver_unwrapped',
  '__webdriver_script_fn',
  '__webdriver_script_func',
  '__webdriver_script_function',
  '__driver_evaluate',
  '__driver_unwrapped',
  '__fxdriver_evaluate',
  '__fxdriver_unwrapped',
  'selenium-evaluate',
  'webdriver-evaluate',
];

/**
 * Detects browser automation driven by Selenium/WebDriver.
 */
export default class SeleniumDetector implements detection.Detector {
  public readonly signal = 'selenium';
  public readonly precedence = PRECEDENCE.FRAMEWORK;

  public triggered = false;
  public indicators: string[] = [];

  private readonly env: detection.Environment;

  public constructor(env: detection.Environment) {
    this.env = env;
  }

  public async detect(): Promise<detection.DetailedDetectionResult> {
    this._detectGlobals();
    this._detectDocumentArtifacts();
    this._detectUserAgent();

    this.triggered = this.indicators.length > 0;

    return {
      signal: this.signal,
      precedence: this.precedence,
      triggered: this.triggered,
      indicators: this.indicators,
    };
  }

  /** Direct Selenium/WebDriver globals injected into the page. */
  private _detectGlobals(): void {
    for (const global of SELENIUM_GLOBALS) {
      if (global in this.env) {
        this.indicators.push(`global-${global}`);
      }
    }
  }

  /** Properties Selenium leaks onto the document object. */
  private _detectDocumentArtifacts(): void {
    const doc = this.env.document;
    if (!doc) {
      return;
    }

    for (const artifact of SELENIUM_DOCUMENT_ARTIFACTS) {
      if (artifact in doc) {
        this.indicators.push(`document-${artifact}`);
      }
    }
  }

  /** User-agent substring left by some Selenium configurations. */
  private _detectUserAgent(): void {
    const userAgent = this.env.navigator?.userAgent ?? '';
    if (/selenium/i.test(userAgent)) {
      this.indicators.push('selenium-user-agent');
    }
  }
}
