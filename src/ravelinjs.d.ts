declare global {
  interface Window {
    cdc_adoQpoasnfa76pfcZLmcfl_Array: boolean;
    cdc_adoQpoasnfa76pfcZLmcfl_Promise: boolean;
    cdc_adoQpoasnfa76pfcZLmcfl_Symbol: boolean;
    /** Present on Chromium; often incomplete under CDP automation. */
    chrome?: { runtime?: unknown };
    /** Node process object when nodeIntegration exposes it in the renderer. */
    process?: {
      type?: string;
      versions?: { electron?: string };
    };
  }

  interface Navigator {
    /** Client Hints; headless Chromium often omits the Google Chrome brand. */
    userAgentData?: {
      brands?: { brand: string; version: string }[];
    };
  }
}

export {};
