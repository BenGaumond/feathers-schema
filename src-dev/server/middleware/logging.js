
export default function (app) {

  /* eslint-disable no-console */
  app.log = console.log.bind(console)
  app.log.error = console.error.bind(console)
  /* eslint-enable */

  return function(error, req, res, next) {
    if (error) {
      const message = `${error.code ? `(${error.code}) ` : '' }Route: ${req.url} - ${error.message}`

      if (error.code === 404) {
        app.log(message)
      }
      else {
        app.log.error(message)
        app.log(error.stack)
      }
    }

    next(error)
  }
}
