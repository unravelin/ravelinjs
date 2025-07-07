module.exports = {
  rootDir: './test2',
  globalSetup: '<rootDir>/global-setup.mjs',
  globalTeardown: '<rootDir>/global-teardown.mjs',
  testMatch: ['<rootDir>/**/*.spec.js']
};
