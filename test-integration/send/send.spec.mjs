import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { buildDriver } from '../utils.mjs';

describe('BStack demo test', () => {
  let driver;

  before(() => {
    driver = buildDriver();
  });

  after(async () => {
    await driver.quit();
  });

  it('send test', async () => {
    await driver.get('http://bs-local.com:3000/send/');

    expect(await driver.getTitle()).to.contain('send test');

    const output = await driver.findElement(By.id('output'));
    const outputText = await output.getText();
    console.log('stats', outputText || 'No output found');

    const error = await driver.findElement(By.id('error'));
    const errorText = await error.getText();
    if (errorText) {
      throw new Error(errorText);
    }
  });
});
