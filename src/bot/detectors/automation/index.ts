import ChromedpDetector from './chromedp-detector';
import ChromiumAutomationDetector from './chromium-automation-detector';
import ElectronDetector from './electron-detector';
import PhantomJSDetector from './phantomjs-detector';
import PlaywrightDetector from './playwright-detector';
import PuppeteerDetector from './puppeteer-detector';
import SeleniumDetector from './selenium-detector';
import SlimerJSDetector from './slimerjs-detector';

export default function createAutomationDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [
    new ChromiumAutomationDetector(env),
    new PuppeteerDetector(env),
    new PlaywrightDetector(env),
    new SeleniumDetector(env),
    new PhantomJSDetector(env),
    new SlimerJSDetector(env),
    new ElectronDetector(env),
    new ChromedpDetector(env),
  ];
}
