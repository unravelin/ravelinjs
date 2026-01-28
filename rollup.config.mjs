import path from 'path';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { globSync } from 'glob';
import { dts } from 'rollup-plugin-dts';
import license from 'rollup-plugin-license';
import packageJson from './package.json' with { type: 'json' };

const output = {
  name: 'Ravelin',
  esModule: false,
  // Prevent Object.freeze being used for namespace references.
  // https://www.rollupjs.org/guide/en/#outputfreeze.
  freeze: false,
  // Prevent Object.defineProperty being used for dynamic exports.
  // https://www.rollupjs.org/guide/en/#outputexternallivebindings.
  externalLiveBindings: false,
};

const plugins = [
  resolve(),
  commonjs({ extensions: ['.js', '.ts'] }),
  replace({
    preventAssignment: true,
    RAVELINJS_VERSION: JSON.stringify(packageJson.version + '-ravelinjs'),
  }),
  license({
    banner: `/*! <%= pkg.name %> <%= pkg.version %> - https://github.com/unravelin/ravelinjs. Copyright <%= moment().format('YYYY') %> */`,
  }),
];

function withTsPlugin(tsConfig) {
  const draft = plugins.slice();
  // Insert typescript plugin after resolve and commonjs
  draft.splice(1, 0, typescript(tsConfig));
  return draft;
}

const builds = globSync('lib-ts/bundle/*.ts')
  .sort((a, b) => b.length - a.length)
  .map(bundle => {
    const fileName = path.parse(bundle).name;

    return [
      {
        // IIFE build for browser usage via <script> tag, no external dependencies.
        // Outputs both normal and minified versions.
        input: bundle,
        plugins: withTsPlugin({ compilerOptions: { noCheck: true, outDir: 'build' } }),
        output: [
          {
            file: 'build/ravelin-' + fileName + '.js',
            format: 'iife',
            ...output,
          },
          {
            file: 'build/ravelin-' + fileName + '.min.js',
            format: 'iife',
            ...output,
            plugins: [terser()],
          },
        ],
      },
      {
        // UMD build for Node and bundlers, with external dependencies.
        input: bundle,
        external: ['@fingerprintjs/botd', 'detectincognitojs'],
        output: {
          file: 'dist/' + fileName + '.js',
          format: 'umd',
          exports: 'default',
          globals: {
            '@fingerprintjs/botd': 'load',
            detectincognitojs: 'detectIncognito',
          },
          ...output,
        },
        plugins: withTsPlugin({
          compilerOptions: {
            noCheck: true,
            outDir: 'dist',
            declaration: true,
            declarationDir: 'dist/types',
          },
        }),
      },
      {
        // TypeScript declaration files for UMD build.
        input: 'dist/types/bundle/' + fileName + '.d.ts',
        output: { file: 'dist/' + fileName + '.d.ts', format: 'es' },
        plugins: [dts()],
      },
    ];
  })
  .flat();

export default builds;
