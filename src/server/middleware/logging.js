export default function () {

  return function(error, req, res, next) {
    if (error) {
      const message = `${error.code ? `(${error.code}) ` : '' }Route: ${req.url} - ${error.message}`

      if (error.code === 404) {
        log(message)
      }
      else {
        log.error(message)
        log(error.stack)
      }
    }

    next(error)
  }
}
