import handler from 'feathers-errors/handler'
import logging from './logging'

export default function () {

  const app = this

  app.use(logging(app))
  app.use(handler())

}
