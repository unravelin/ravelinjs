import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { globSync } from 'glob';

// Bundle each bot spec so Rollup resolves extensionless TypeScript imports
// before Mocha loads the result. `chai` stays external.
const entries = globSync('test-unit/bot/**/*.spec.mjs');

export default {
  input: Object.fromEntries(
    entries.map(entry => [entry.slice('test-unit/bot/'.length, -'.mjs'.length), entry])
  ),
  external: ['chai'],
  plugins: [
    resolve({ extensions: ['.mjs', '.js', '.ts', '.json'] }),
    typescript({ compilerOptions: { noCheck: true, outDir: 'build/bot-tests' } }),
  ],
  output: {
    dir: 'build/bot-tests',
    format: 'es',
    entryFileNames: '[name].mjs',
    chunkFileNames: 'chunks/[name]-[hash].mjs',
  },
};
