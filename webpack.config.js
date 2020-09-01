const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = function(env, argv) {
  return {
    mode: 'production',
    devtool: false,
    entry: {
      'ravelin': path.resolve(__dirname, 'src/ravelin.js'),
      'ravelin.min': path.resolve(__dirname, 'src/ravelin.js'),
      'ravelin-no-encrypt': path.resolve(__dirname, 'src/ravelin-no-encrypt.js'),
      'ravelin-no-encrypt.min': path.resolve(__dirname, 'src/ravelin-no-encrypt.js'),
    },
    output: {
      pathinfo: false,
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      library: 'ravelinjs',
      libraryTarget: 'umd',
    },
    module: {rules: [
      {
        // Use val-loader to bundle version.js so that we can avoid bundling
        // all of package.json too.
        test: /version.js$/,
        use: [{loader: 'val-loader'}],
      },
    ]},
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          include: /\.min\.js$/,
          terserOptions: {
            ie8: true,
            safari10: true,
          },
        }),
      ],
    },
  };
};
