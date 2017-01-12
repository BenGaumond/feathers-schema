import is from 'is-explicit'
import ObjectId from 'bson-objectid'

import { NotImplemented } from 'feathers-errors'

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
  const set = arguments.length > 2 && !get && !has

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]

    if (i === final)
      return has ? path in obj
           : get ? obj[path]
           :/*set*/void (obj[path] = smart)

    if (!is(obj, Object))
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

export function checkErrorMsg(msg) {
  if (is(msg) && !is(msg, String))
    throw new Error('msg configuration property needs to be a String if defined.')
}

export function parseValidatorConfig(input = [], ...keys) {

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

export function castTo(value, type) {

  if (is(value, type))
    return value

  switch (type) {

  case String:
    return is(value) ? value + '' : ''

  case Number:
    return parseFloat(value)

  case Boolean:
    return !!value

  case Date:
    return is(value) ? new Date(value) : null

  case ObjectId:
    return is(value) ? new ObjectId(String(value)) : null

  default:
    throw new NotImplemented(`Cannot cast to ${type}`)

  }
}
