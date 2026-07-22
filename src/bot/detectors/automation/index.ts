import CDPDetector from './cdp-detector';
import ChromeDriverDetector from './chromedriver-detector';
import PhantomJSDetector from './phantomjs-detector';
import PlaywrightDetector from './playwright-detector';
import PuppeteerDetector from './puppeteer-detector';
import SeleniumDetector from './selenium-detector';
import WebDriverDetector from './webdriver-detector';

export default function createAutomationDetectors(
  env: detection.Environment
): detection.Detector[] {
  return [
    new WebDriverDetector(env),
    new ChromeDriverDetector(env),
    new PlaywrightDetector(env),
    new PuppeteerDetector(env),
    new SeleniumDetector(env),
    new CDPDetector(env),
    new PhantomJSDetector(env),
  ];
}
