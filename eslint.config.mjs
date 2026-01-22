import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  // Ignore built and vendored files
  globalIgnores(['**/ravelin.js', '**/*-vendored.js']),
  // Browser modules
  {
    files: ['lib/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        RAVELINJS_VERSION: 'readonly',
      },
      sourceType: 'module',
    },
    plugins: { js },
    extends: ['js/recommended'],
  },
  // Browser scripts
  {
    files: ['test-integration/**/*.js', 'test-unit/**/*.js'],
    languageOptions: {
      globals: globals.browser,
      sourceType: 'script',
    },
    plugins: { js },
    extends: ['js/recommended'],
  },
  // NodeJS modules
  {
    files: ['test-integration/**/*.mjs', 'test-unit/**/*.mjs', 'test-unit/karma.conf.js'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
    },
    plugins: { js },
    extends: ['js/recommended'],
  },
  // Test globals
  {
    files: ['test-integration/**/*.mjs', 'test-unit/**/*.js'],
    languageOptions: {
      globals: {
        $: 'readonly',
        after: 'readonly',
        afterEach: 'readonly',
        before: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        keysMatch: 'readonly',
        module: 'readonly',
        Ravelin: 'readonly',
        xhook: 'readonly',
      },
    },
  },
  {
    rules: {
      // Disable no-unused-vars before migrating to TypeScript
      'no-unused-vars': 'off',
    },
  },
]);
