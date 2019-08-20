const path = require('path');

module.exports = {
  mode: 'development',
  devtool: false,
  entry: {
    'ravelin': path.resolve(__dirname, 'src/ravelin.js'),
    'ravelin-no-encrypt': path.resolve(__dirname, 'src/ravelin-no-encrypt.js'),
  },
  output: {
    pathinfo: false,
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: 'ravelinjs',
    libraryTarget: 'umd',
  },
};
