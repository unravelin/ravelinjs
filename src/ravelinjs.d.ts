declare global {
  interface Window {
    __puppeteer_evaluation_script__: boolean;
    __puppeteer: boolean;
    puppeteer: boolean;
    cdc_adoQpoasnfa76pfcZLmcfl_Array: boolean;
    cdc_adoQpoasnfa76pfcZLmcfl_Promise: boolean;
    cdc_adoQpoasnfa76pfcZLmcfl_Symbol: boolean;
    /** PhantomJS bridge from page to the outer driver. */
    callPhantom?: () => unknown;
    /** PhantomJS internal object. */
    _phantom?: unknown;
    /** PhantomJS module / runtime handle. */
    phantom?: unknown;
  }
}

export {};
