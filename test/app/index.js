import feathers from 'feathers'
import hooks from 'feathers-hooks'
import rest from 'feathers-rest'

import bodyParser from 'body-parser'

import middleware from './middleware'

const PORT = 5000
const HOST = 'localhost'

let server = null

const api = feathers()
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))

  .configure(hooks())
  .configure(rest())
  .configure(middleware)

api.start = () => {
  if (server)
    return

  return new Promise(res => {
    server = api.listen(PORT, HOST)
    server.once('listening', res)
  })

}

api.end = () => {
  if (!server)
    return

  return new Promise(res => {
    server.close()
    server.once('close', () => {
      server = null
      res()
    })
  })
}

export default api

export { api }
