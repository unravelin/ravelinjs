const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = function(env, argv) {
  const production = env === 'production';
  const entry = {
    'ravelin': path.resolve(__dirname, 'src/ravelin.js'),
    'ravelin-no-encrypt': path.resolve(__dirname, 'src/ravelin-no-encrypt.js'),
  };

  if (production) {
    entry['ravelin.min'] = entry['ravelin'];
    entry['ravelin-no-encrypt.min'] = entry['ravelin-no-encrypt'];
  }

  return {
    mode: production ? 'production' : 'development',
    devtool: false,
    entry: entry,
    output: {
      pathinfo: false,
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      library: 'ravelinjs',
      libraryTarget: 'umd',
    },
    optimization: {
      minimize: production,
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
