import { expect } from 'chai';
import { Builder, By, Capabilities } from 'selenium-webdriver';

describe('BStack demo test', () => {
  let driver;

  before(() => {
    driver = new Builder()
      .usingServer('http://localhost:4444/wd/hub')
      .withCapabilities(Capabilities.chrome())
      .build();
  });

  after(async () => {
    await driver.quit();
  })

  it('send test', async () => {
    await driver.get('http://bs-local.com:3000/send/');

    expect(await driver.getTitle()).to.contain('send test');

    const output = await driver.findElement(By.id('output'));
    console.log('stats', output?.innerText || 'No output found');

    const err = await driver.findElement(By.id('error'));
    if (err?.innerText) {
      throw new Error(err.innerText);
    }
  }, 10 * 1000);
});
