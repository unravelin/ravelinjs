import createChromedpDetector from './chromedp-detector';
import createPhantomJSDetector from './phantomjs-detector';
import createPlaywrightDetector from './playwright-detector';
import createPuppeteerDetector from './puppeteer-detector';
import createSeleniumDetector from './selenium-detector';

export default function createAutomationDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [
    createPuppeteerDetector(env),
    createPhantomJSDetector(env),
    createSeleniumDetector(env),
    createPlaywrightDetector(env),
    createChromedpDetector(env),
  ];
}
