const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: false,
  entry: path.resolve(__dirname, 'pages/webpack/index.js'),
  output: {
    pathinfo: false,
    path: path.resolve(__dirname, 'pages/webpack'),
    filename: 'bundle.js',
    library: 'ravelinjs-spec',
    libraryTarget: 'umd',
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        include: /\.js$/,
        extractComments: false,
        terserOptions: {
          ie8: true,
          safari10: true,
        },
      }),
    ],
  },
};
