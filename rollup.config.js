import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
// import esbuild from 'rollup-plugin-esbuild';
import glob from 'glob';
import * as path from 'path';
import license from 'rollup-plugin-license';
import { terser } from 'rollup-plugin-terser';
import packageJson from './package.json';

var builds = module.exports = [];

var output = {
  format: 'iife',
  name: 'Ravelin',
  esModule: false,

  // Prevent Object.freeze being used for namespace references.
  // https://www.rollupjs.org/guide/en/#outputfreeze.
  freeze: false,
  // Prevent Object.defineProperty being used for dynamic exports.
  // https://www.rollupjs.org/guide/en/#outputexternallivebindings.
  externalLiveBindings: false,
};
var plugins = [
  typescript({ compilerOptions: { noCheck: true } }),
  // esbuild(),
  resolve(),
  commonjs({ extensions: ['.js', '.ts'] }),
  replace({
    preventAssignment: true,
    'RAVELINJS_VERSION': JSON.stringify(packageJson.version + '-ravelinjs'),
  }),
  license({
    banner: `/*! <%= pkg.name %> <%= pkg.version %> - https://github.com/unravelin/ravelinjs. Copyright <%= moment().format('YYYY') %> */`,
  }),
];

glob.sync('lib-ts/bundle/*.ts')
.sort((a, b) => b.length - a.length)
.forEach(bundle => {
  const fileName = path.parse(bundle).name;

  return builds.push(
    {
      input: bundle,
      output: {
        file: 'build/ravelin-' + fileName + '.min.js',
        ...output,
      },
      plugins: plugins.concat([
        terser({
          compress: {
            typeofs: false,
          },
          safari10: true,
        }),
      ]),
    },
    {
      input: bundle,
      output: {
        file: 'build/ravelin-' + fileName + '.js',
        ...output,
      },
      plugins: plugins,
    },
    {
      input: bundle,
      external: ['@fingerprintjs/botd', 'detectincognitojs'],
      output: {
        file: 'dist/' + fileName + '.js',
        format: 'umd',
        name: 'Ravelin',
        esModule: false,
        exports: 'default',
        globals: {
          '@fingerprintjs/botd': 'load',
          detectincognitojs: 'detectIncognito',
        },

        // Prevent Object.freeze being used for namespace references.
        // https://www.rollupjs.org/guide/en/#outputfreeze.
        freeze: false,
        // Prevent Object.defineProperty being used for dynamic exports.
        // https://www.rollupjs.org/guide/en/#outputexternallivebindings.
        externalLiveBindings: false,
      },
      plugins: plugins,
    }
  );
});
