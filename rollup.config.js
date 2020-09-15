import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import { basename } from 'path';
import glob from 'glob';

const bundles = glob.sync("lib/bundle/*.js");

export default bundles.map(bundle => (
  {
    input: bundle,
    output: {
      file: 'build/ravelin-' + basename(bundle),
      format: 'iife',
      name: 'ravelinjs'
    },
    plugins: [
      replace({
        'process.env.npm_package_version': JSON.stringify(require('./package.json').version),
      }),
      resolve(),
      commonjs(),
    ]
  }
));
