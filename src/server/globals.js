import is from 'is-explicit'
import path from 'path'
import { addPath } from 'app-module-path'

/******************************************************************************/
// Log Methods
/******************************************************************************/

function log(/*args*/) {
  log.info(...arguments)
}

log.types = {};

['debug', 'info', 'error', 'db'].forEach(type => {
  log.types[type] = true
  log[type] = function() {
    if (this.types[type])
      console.log(`${type}:`, ...arguments) //eslint-disable-line
  }
})

Object.seal(log)

/******************************************************************************/
// Local Module Require
/******************************************************************************/

addPath(path.resolve(__dirname, '../dist-iso'))
addPath(__dirname)

/******************************************************************************/
// Globals
/******************************************************************************/

global.is = is
global.log = log
global.HOST = ''
