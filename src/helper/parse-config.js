import { ANY } from '../types'
import toArray from './cast-array'
import is from 'is-explicit'

const EXPECTING_ARRAY = Symbol('expecting-array')

/******************************************************************************/
// Helper
/******************************************************************************/

function valueValid (value, types, throwKey = null) {

  if (types.includes(ANY))
    return throwKey ? void 0 : true

  if (!is(value))
    return throwKey ? void 0 : false

  const valid = is(value, ...types)

  if (!throwKey)
    return valid

  else if (!valid)
    throw new Error(`${throwKey} is expected to be ${
      types.length > 1 ? 'one of:' : 'a'
    } ${
      types.map(type => type.name)
    }`)

}

function parseDetail (detail) {

  if (!is.plainObject(detail))
    throw new Error('Malformed config detail object.')

  const parsed = {
    [EXPECTING_ARRAY]: false
  }

  for (const key in detail) {
    const sub = detail[key]
    let type = ANY
    let _default
    let required = false

    if (is.plainObject(sub)) {

      required = sub.required || required
      type = sub.type
      _default = sub.default || _default

    } else
      type = sub

    type = type::toArray()

    if (!type.every(t => t === ANY || is(t, Function)))
      throw new Error(`detail type argument invalid: ${type}`)

    if (!parsed[EXPECTING_ARRAY] && type.includes(Array))
      parsed[EXPECTING_ARRAY] = true

    parsed[key] = { type, required, _default }
  }

  return parsed
}

function containsArray (arr) {

  return arr::toArray().some(v => is(v, Array))

}

/******************************************************************************/
// Exports
/******************************************************************************/

export default function parseConfig (input, detail) {

  detail = parseDetail(detail)

  // reduce argument array down to a single value, long array or object
  while (is(input, Array) && input.length === 1)
    input = input[0]

  const isObject = is.plainObject(input)
  if (!isObject)
    input = input::toArray()

  if (!isObject && detail[EXPECTING_ARRAY] && !containsArray(input))
    input = [input]

  const config = {}

  for (const key in detail) {

    const { type, required, _default } = detail[key]
    let value = null

    if (isObject) {

      value = input[key]
      valueValid(value, type, key)

    } else for (let i = 0; i < input.length; i++) {

      const maybe = input[i]
      if (valueValid(maybe, type)) {
        value = maybe
        input.splice(i, 1)
        break
      }

    }

    if (!is(value) && is(_default))
      value = _default

    if (is(value))
      config[key] = value

    else if (required)
      throw new Error(`'${key}' config property is required for this validator.`)

  }

  return config
}
