const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const replace = require('@rollup/plugin-replace');
const typescript = require('@rollup/plugin-typescript');
// const esbuild = require('rollup-plugin-esbuild');
const terser = require('@rollup/plugin-terser');
const glob = require('glob');
const path = require('path');
const license = require('rollup-plugin-license');
const packageJson = require('./package.json');
// const { dts } = require('rollup-plugin-dts');

const builds = module.exports = [];

const output = {
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

const plugins = [
  // typescript({ compilerOptions: { noCheck: true } }),
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
    // {
    //   input: bundle,
    //   output: {
    //     file: 'build/ravelin-' + fileName + '.min.js',
    //     ...output,
    //   },
    //   plugins: [
    //     typescript({ compilerOptions: { noCheck: true, outDir: 'build' } }),
    //     ...plugins,
    //     terser({
    //       compress: {
    //         typeofs: false,
    //       },
    //       safari10: true,
    //     }),
    //   ],
    // },
    // {
    //   input: bundle,
    //   output: {
    //     file: 'build/ravelin-' + fileName + '.js',
    //     ...output,
    //   },
    //   plugins: [
    //     typescript({ compilerOptions: { noCheck: true, outDir: 'build' } }),
    //     ...plugins,
    //   ],
    // },
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
      plugins: [
        typescript({
          compilerOptions: {
            noCheck: true,
            outDir: 'dist',
            declaration: true,
          },
        }),
        ...plugins,
      ],
    },
    // {
    //   input: 'dist/bundle/' + fileName + '.d.ts',
    //   output: { file: 'dist/' + fileName + '.d.ts', format: 'es' },
    //   plugins: [dts()],
    // }
  );
});
