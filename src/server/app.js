import feathers from 'feathers'
import configuration from 'feathers-configuration'
import hooks from 'feathers-hooks'
import rest from 'feathers-rest'

import path from 'path'
import cors from 'cors'
import compress from 'compression'
import bodyParser from 'body-parser'
import { static as serveStatic } from 'feathers'
import fallback from 'express-history-api-fallback'
import favicon from 'serve-favicon'

import middleware from 'middleware'
import services from 'services'

/******************************************************************************/
// Config
/******************************************************************************/

const app = feathers()
const configURL = path.resolve(__dirname, '..')
const favURL = path.resolve(__dirname, '../favicon.png')

app.configure(configuration(configURL))

const publicURL = app.get('public')

app.use(compress())
  .options('*', cors())
  .use(cors())

  .use('/assets', serveStatic(publicURL + '/assets'))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(favicon(favURL))

  .configure(hooks())
  .configure(rest())
  .configure(services)
  .configure(middleware)

  .use(fallback('index.html', { publicURL }))

/******************************************************************************/
// Exports
/******************************************************************************/

export default app
