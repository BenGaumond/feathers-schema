import is from 'is-explicit'

import { ALL, ANY } from './types'

const $HAS = Symbol('path-exists')
const $GET = Symbol('path-value')

function smartIn(obj, paths, smart) {

  if (!is(obj, Object))
    throw new Error('expects an object as first argument.')

  if (is(paths, String, Symbol))
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
           : get ? obj[path]
           :/*set*/void (obj[path] = smart)

    if (!is(obj[path], Object))
      if (set)
        obj[path] = {}
      else
        return has ? false
             :/*get*/undefined

    obj = obj[path]
  }
}

export function setIn(obj, paths, value) {
  smartIn(obj, paths, value)
}

export function getIn(obj, paths) {
  return smartIn(obj, paths, $GET)
}

export function hasIn(obj, paths) {
  return smartIn(obj, paths, $HAS)
}

export function isPlainObject(obj) {
  return is(obj, Object) && obj.constructor === Object
}

export function compareId(idA, idB) {

  return is(idA, Object) && is(idA.equals, Function)
    ? idA.equals(idB)

    : is(idB, Object) && is(idB.equals, Function)
    ? idB.equals(idA)

    : idA === idB
}

export function createErrorMessager(msg, _default) {

  if (is(msg) && !is(msg, String) && !is(msg, Function))
    throw new Error('msg needs to be a String or Function.')

  if (!is(_default, String) && !is(_default, Function))
    _default = 'Validation Failed.'

  return is(msg, Function) ? msg
  : is(msg, String)        ? () => msg
  : is(_default, Function) ? _default
  :                          () => _default
}

export function checkType(type, shouldBe, name = 'this') {

  shouldBe = is(shouldBe, Array) ? shouldBe : [shouldBe]

  for (const otherType of shouldBe) {
    if (otherType === ANY)
      throw new Error('Don\'t use this function to check ANY type.')

    if (!ALL.includes(otherType))
      throw new Error('Unsupported Type: ' + otherType)
  }

  if (!shouldBe.includes(type))
    throw new Error(`${name} is for ${shouldBe.map( t => t.name )} properties only.`)
}

export function parseConfig(input = [], ...keys) {

  //Validators can take arguments, an array of arguments, or arguments as a keyed
  //object. If the input is an array of length 1, we'll unwrap it to prevent the possibility
  //of an array of arguments being wrapped twice being fed into this method
  if (is(input, Array) && input.length === 1)
    input = input[0]

  if (!is(input, Array) && !isPlainObject(input))
    input = [input]

  const config = {}

  if (is(input, Array))
    for (let i = 0; i < input.length; i++)
      config[keys[i]] = input[i]

  else if (isPlainObject(input))
    for (const key of keys)
      config[key] = input[key]

  return config
}
