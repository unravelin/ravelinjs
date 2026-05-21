declare global {
  interface Window {
    __puppeteer_evaluation_script__: boolean;
    __puppeteer: boolean;
    puppeteer: boolean;
    cdc_adoQpoasnfa76pfcZLmcfl_Array: boolean;
    cdc_adoQpoasnfa76pfcZLmcfl_Promise: boolean;
    cdc_adoQpoasnfa76pfcZLmcfl_Symbol: boolean;
    /** Present on Chromium; often incomplete under CDP automation. */
    chrome?: { runtime?: unknown };
    /** PhantomJS bridge from page to the outer driver. */
    callPhantom?: () => unknown;
    /** PhantomJS internal object. */
    _phantom?: unknown;
    /** PhantomJS module / runtime handle. */
    phantom?: unknown;
  }

  interface Navigator {
    /** Client Hints; headless Chromium often omits the Google Chrome brand. */
    userAgentData?: {
      brands?: { brand: string; version: string }[];
    };
  }
}

export {};
