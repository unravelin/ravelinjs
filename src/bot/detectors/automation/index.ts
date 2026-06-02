import ChromedpDetector from './chromedp-detector';
import HeadlessChromeDetector from './headless-chrome-detector';
import PhantomJSDetector from './phantomjs-detector';
import PlaywrightDetector from './playwright-detector';
import PuppeteerDetector from './puppeteer-detector';
import SeleniumDetector from './selenium-detector';

export default function createAutomationDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [
    new HeadlessChromeDetector(env),
    new PuppeteerDetector(env),
    new PlaywrightDetector(env),
    new SeleniumDetector(env),
    new PhantomJSDetector(env),
    new ChromedpDetector(env),
  ];
}
