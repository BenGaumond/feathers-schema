const path = require('path')
const { DefinePlugin } = require('webpack')
const serverConfig = require('./default.json')

const host = 'localhost',
  port = 5000

module.exports = {
  entry: [
    `webpack-dev-server/client?http://${host}:${port}`,
    path.resolve(__dirname, '../src-dev/client/index.js')
  ],

  module: {
    loaders: [
      {
        test: /\.s?css$/,
        loaders: ['style', 'css', 'resolve-url', 'sass']
      },
      {
        test: /\.(ttf|eot|ico|png|gif|mp4|jpg)$/,
        loader: 'file'
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loaders: ['babel']
      }
    ]
  },

  resolve: {
    extensions: ['', '.js', '.jsx'],
    root: [
      path.resolve(__dirname, '../src-dev'),
      path.resolve(__dirname, '../src')
    ]
  },

  devServer : {
    contentBase: path.resolve(__dirname, '../src-dev/client'),
    hot: false,
    historyApiFallback: true,
    host,
    port
  },

  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM'
  },

  output: {
    path: path.resolve(__dirname, '../src-dev/client'),
    filename: 'bundle.js'
  },

  plugins: [
    new DefinePlugin({
      HOST: `'http://${serverConfig.host}:${serverConfig.port}'`
    })
  ]

}
