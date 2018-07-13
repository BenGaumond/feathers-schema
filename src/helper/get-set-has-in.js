import is from 'is-explicit'

const $HAS = Symbol('path-exists')
const $GET = Symbol('path-value')

function smartIn (obj, paths, smart) {

  if (!is(obj, Object))
    throw new Error('expects an object as first argument.')

  if (is(paths, [String, Symbol]))
    paths = [paths]

  if (!is(paths, Array))
    throw new Error('expects a string, symbol or array thereof as second argument.')

  const final = paths.length - 1

  const get = smart === $GET
  const has = smart === $HAS
  const set = arguments.length >= 2 && !get && !has

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]

    if (i === final)
      return has ? path in obj
          : get ? obj[path]                               // eslint-disable-line
          :/* set */void (obj[path] = smart)

    if (!is(obj[path], Object))
      if (set)
        obj[path] = {}
      else
        return has ? false
          :/* get */undefined

    obj = obj[path]
  }
}

export function setIn (obj, paths, value) {
  smartIn(obj, paths, value)
}

export function getIn (obj, paths) {
  return smartIn(obj, paths, $GET)
}

export function hasIn (obj, paths) {
  return smartIn(obj, paths, $HAS)
}
