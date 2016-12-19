const config = require('./webpack.default.js')
const path = require('path')
const UglifyJsPlugin = require('webpack').optimize.UglifyJsPlugin
const HtmlPlugin = require('html-webpack-plugin')
const { DefinePlugin } = require('webpack')

config.output.path = path.join(config.output.path, 'assets')

config.plugins.push(

  new HtmlPlugin({
    template: path.join(__dirname, '../src-client/production.html'),
    filename: '../index.html',
    inject: false
  }),

  new UglifyJsPlugin({
    mangle: false
  }),

  new DefinePlugin({
    HOST: '\'http://www.nutter.globalmechanic.com/\''
  })
)

module.exports = config
