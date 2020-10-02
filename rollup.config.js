import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import { basename } from 'path';
import glob from 'glob';

var builds = module.exports = [];

var output = {
  format: 'iife',
  sourcemap: true,
  name: 'Ravelin',

  // Prevent Object.freeze being used for namespace references.
  // https://www.rollupjs.org/guide/en/#outputfreeze.
  freeze: false,
  // Prevent Object.defineProperty being used for dynamic exports.
  // https://www.rollupjs.org/guide/en/#outputexternallivebindings.
  externalLiveBindings: false,
};
var plugins = [
  replace({
    'RAVELINJS_VERSION': JSON.stringify(require('./package.json').version + '-ravelinjs'),
  }),
  resolve(),
  commonjs(),
];

glob.sync("lib/bundle/*.js").forEach(bundle => builds.push(
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
    output: {
      file: 'build/ravelin-' + basename(bundle).replace(/\.js$/, '.min.js'),
      ...output,
    },
    plugins: plugins.concat([
      terser({
        compress: {
          typeofs: false,
        },
        ie8: true,
        safari10: true,
      }),
    ]),
  },
));
