import feathers from 'feathers'
import hooks from 'feathers-hooks'
import rest from 'feathers-rest'

import bodyParser from 'body-parser'

import middleware from './middleware'

const PORT = 5001
const HOST = 'localhost'

export default class App {

  constructor() {
    this.feathers = feathers()
      .use(bodyParser.json())
      .use(bodyParser.urlencoded({ extended: true }))

      .configure(hooks())
      .configure(rest())
      .configure(middleware)
  }

  start = () => {
    if (this.server)
      return

    return new Promise(res => {
      this.server = this.feathers.listen(PORT, HOST)
      this.server.once('listening', res)
    })

  }

  configure = (...args) => this.feathers.configure(...args)

  service = (...args) => this.feathers.service(...args)

  use = (...args) => this.feathers.use(...args)

  end = () => {
    if (!this.server)
      return

    return new Promise(res => {
      this.server.close()
      this.server.once('close', () => {
        this.server = null
        res()
      })
    })
  }

  server = null
}

export { PORT, HOST }
