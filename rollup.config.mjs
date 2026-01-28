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

const builds = globSync('src/*.ts')
  .sort((a, b) => b.length - a.length)
  .map(bundle => {
    const fileName = path.parse(bundle).name;

    return [
      {
        input: bundle,
        output: {
          file: 'build/ravelin-' + fileName + '.min.js',
          format: 'iife',
          ...output,
        },
        plugins: [
          typescript({ compilerOptions: { noCheck: true, outDir: 'build' } }),
          ...plugins,
          terser(),
        ],
      },
      {
        input: bundle,
        output: {
          file: 'build/ravelin-' + fileName + '.js',
          format: 'iife',
          ...output,
        },
        plugins: [typescript({ compilerOptions: { noCheck: true, outDir: 'build' } }), ...plugins],
      },
      {
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
        plugins: [
          typescript({
            compilerOptions: {
              noCheck: true,
              outDir: 'dist',
              declaration: true,
              declarationDir: 'dist/types',
            },
          }),
          ...plugins,
        ],
      },
      {
        input: 'dist/types/' + fileName + '.d.ts',
        output: { file: 'dist/' + fileName + '.d.ts', format: 'es' },
        plugins: [dts()],
      },
    ];
  })
  .flat();

export default builds;
