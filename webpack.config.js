const path = require('path');

module.exports = {
  target: 'node', // Extensions run in a Node.js-context
  entry: './src/extension.ts', // The entry point of this extension
  output: {
    path: path.resolve(__dirname, 'dist'), // The bundle's output path
    filename: 'extension.js', // The name of the resulting bundle
    libraryTarget: 'commonjs2', // The module system, for node
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map', // Include source maps (important for debugging purposes)
  externals: {
    vscode: 'commonjs vscode', // Tells Webpack to not include 'vscode' module in the bundle
  },
  resolve: {
    extensions: ['.ts', '.js'], // Resolve these extensions
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: ['ts-loader'],
      },
    ],
  },
};
