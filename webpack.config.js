const path = require('path');

module.exports = {
  mode: 'development',
  devtool: false,
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    pathinfo: false,
    path: path.resolve(__dirname, 'dist'),
    filename: 'ravelin.js',
    library: 'ravelinjs',
    libraryTarget: 'umd',
  },
  externals: {
    crypto: 'crypto',
  },
};
