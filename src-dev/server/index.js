import path from 'path'

import feathers from 'feathers'
import configuration from 'feathers-configuration'
import hooks from 'feathers-hooks'
import rest from 'feathers-rest'

import bodyParser from 'body-parser'

import middleware from './middleware'
import services from './services'

const app = feathers()
const configURL = path.resolve(__dirname, '../..')

app.configure(configuration(configURL))

app.use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))

  .configure(hooks())
  .configure(rest())
  .configure(services)
  .configure(middleware)

  .get('/', )

const port = app.get('port')
const host = app.get('host')

const server = app.listen(port, host)

server.on('listening', () => console.log(`Listening on port ${port}`)) //eslint-disable-line
