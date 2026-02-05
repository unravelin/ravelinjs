import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig([
  // Ignore built and vendored files
  globalIgnores(['build', 'dist', 'node_modules', '**/ravelin.js', '**/*-vendored.{js,ts}']),
  // Browser modules (TypeScript)
  {
    files: ['lib-ts/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
      globals: {
        ...globals.browser,
        RAVELINJS_VERSION: 'readonly',
      },
      sourceType: 'module',
    },
    plugins: { js, '@typescript-eslint': ts.plugin },
    extends: [
      'js/recommended',
      '@typescript-eslint/recommended',
      // TODO: enable later?
      // '@typescript-eslint/recommended-type-checked',
    ],
    rules: {
      '@typescript-eslint/explicit-member-accessibility': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off', // Handled by 'noUnusedLocals' in TS config
      // '@typescript-eslint/no-unsafe-function-type': 'off',
      // '@typescript-eslint/no-unsafe-assignment': 'off',
      // '@typescript-eslint/no-unsafe-call': 'off',
      // '@typescript-eslint/no-unsafe-member-access': 'off',
      // '@typescript-eslint/no-unsafe-return': 'off',
    },
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
    files: ['test-*/**/*.mjs', 'test-unit/karma.conf.js'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
    },
    plugins: { js },
    extends: ['js/recommended'],
  },
  // Test globals
  {
    files: ['test-*/**/*.{js,mjs}'],
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
