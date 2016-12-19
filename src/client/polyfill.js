//IE-11 compatibility
window.Object.assign = window.Object.assign || require('object-assign')

window.Promise = window.Promise || require('promise-polyfill')

window.addEvent = (event, target, method) => {

  if (target.addEventListener)
    target.addEventListener(event, method, false)

  else if (target.attachEvent)
    target.attachEvent('' + event, method)

}

window.removeEvent = (event, target, method) => {

  if (target.addEventListener)
    target.removeEventListener(event, method, false)

  else if (target.attachEvent)
    target.detachEvent('' + event, method)

}
