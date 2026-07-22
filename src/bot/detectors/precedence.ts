/**
 * @fileoverview Shared precedence tiers for detectors. When multiple detectors
 * trigger, the highest-precedence result is reported as the primary signal, so
 * these tiers rank how specific and hard-to-forge a signal is. Higher numbers
 * win.
 */

export const PRECEDENCE = {
  /**
   * Generic automation flags shared across many tools and relatively easy to
   * spoof (e.g. `navigator.webdriver`, headless heuristics).
   */
  GENERIC: 10,

  /**
   * Artifacts tied to a specific automation driver/server that underpins other
   * frameworks (e.g. ChromeDriver's injected keys).
   */
  DRIVER: 25,

  /**
   * Artifacts tied to a specific automation framework built on top of a driver
   * (e.g. Selenium's injected globals and document leaks).
   */
  FRAMEWORK: 50,

  /**
   * Direct, hard-to-forge artifacts a specific tool injects into the page (e.g.
   * Playwright's or Puppeteer's private globals). Highest confidence.
   */
  HARD_ARTIFACT: 100,
};
