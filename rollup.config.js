import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import glob from 'glob';
import { basename } from 'path';
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
  replace({
    preventAssignment: true,
    'RAVELINJS_VERSION': JSON.stringify(packageJson.version + '-ravelinjs'),
  }),
  resolve(),
  commonjs(),
  license({
    banner: `/*! <%= pkg.name %> <%= pkg.version %> - https://github.com/unravelin/ravelinjs. Copyright <%= moment().format('YYYY') %> */`,
  }),
];

glob.sync('lib/bundle/*.js')
.sort((a, b) => b.length - a.length)
.forEach(bundle => builds.push(
  {
    input: bundle,
    output: {
      file: 'build/ravelin-' + basename(bundle).replace(/\.js$/, '.min.js'),
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
      file: 'build/ravelin-' + basename(bundle),
      ...output,
    },
    plugins: plugins,
  },
  {
    input: bundle,
    external: ['@fingerprintjs/botd', 'detectincognitojs'],
    output: {
      file: 'dist/' + basename(bundle),
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
));
