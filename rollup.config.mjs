import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import license from 'rollup-plugin-license';

import { readFile } from 'fs/promises';
import glob from 'glob';
import { basename } from 'path';

const pkg = JSON.parse(
  await readFile(
    new URL('./package.json', import.meta.url)
  )
);

const builds = [];
export default builds;

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
    'RAVELINJS_VERSION': JSON.stringify(pkg.version + '-ravelinjs'),
  }),
  resolve(),
  commonjs(),
  license({
    banner: `/*! <%= pkg.name %> <%= pkg.version %> - https://github.com/unravelin/ravelinjs. Copyright <%= moment().format('YYYY') %> */`,
  }),
];

glob.sync("lib/bundle/*.js")
.sort((a, b) => b.length - a.length)
.forEach(bundle => builds.push(
  {
    strictDeprecations: true,
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
  {
    strictDeprecations: true,
    input: bundle,
    output: {
      file: 'build/ravelin-' + basename(bundle),
      ...output,
    },
    plugins: plugins,
  },
  {
    strictDeprecations: true,
    input: bundle,
    output: {
      file: 'dist/' + basename(bundle),
      format: 'umd',
      name: 'Ravelin',
      esModule: false,
      exports: 'default',

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
