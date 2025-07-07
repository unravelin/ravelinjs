const { Builder, By, Capabilities } = require('selenium-webdriver');

describe('BStack demo test', () => {
  let driver;

  beforeAll(() => {
    driver = new Builder()
      .usingServer('http://localhost:4444/wd/hub')
      .withCapabilities(Capabilities.chrome())
      .build();
  });

  afterAll(async () => {
    await driver.quit();
  })

  test('send test', async () => {
    await driver.get('http://bs-local.com:3000/send/');

    expect(await driver.getTitle()).toContain('send test');

    const output = await driver.findElement(By.id('output'));
    console.log('stats', output?.innerText || 'No output found');

    const err = await driver.findElement(By.id('error'));
    if (err?.innerText) {
      throw new Error(err.innerText);
    }
  }, 10 * 1000);
});
