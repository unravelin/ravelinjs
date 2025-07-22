import { Builder, Capabilities } from 'selenium-webdriver';
// import bstackPkg from 'browserstack-node-sdk';

// const { BrowserStackSdk } = bstackPkg;

export function buildDriver() {
  return new Builder()
    .usingServer('http://localhost:4444/wd/hub')
    .withCapabilities(Capabilities.chrome())
    .build();
}

// function getCapabilities() {
//   const platform = BrowserStackSdk.getCurrentPlatform();

//   switch (platform.browserName.toLowerCase()) {
//     case 'chrome':
//     case 'samsung':
//       return Capabilities.chrome();
//     case 'ie':
//       return Capabilities.ie();
//     case 'edge':
//       return Capabilities.edge();
//     case 'firefox':
//       return Capabilities.firefox();
//     default:
//       throw new Error(`Unsupported browser: ${platform.browserName}`);
//   }
// }
