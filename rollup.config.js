import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

export default [
  {
    input: 'lib/pkg/core+track+encrypt+promise.js',
    output: {
      file: 'build/ravelin.js',
      format: 'umd',
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
];
