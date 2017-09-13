import is from 'is-explicit'
import { toArray } from './helper'

const { freeze } = Object

/******************************************************************************/
// Constants
/******************************************************************************/

const ANY = null

const DEFAULT_TYPES = freeze([
  String,
  Number,
  Boolean,
  Date,
  Object,
  ANY
])

/******************************************************************************/
// Casting Methods
/******************************************************************************/

const DEFAULT_HANDLERS = new Map()

DEFAULT_HANDLERS.set(String, value => is(value) ? `${value}` : null)

DEFAULT_HANDLERS.set(Number, value => {

  return is(value, Object)
    ? 'valueOf' in value ? value.valueOf() : null
    : Number(value)

})

DEFAULT_HANDLERS.set(Boolean, value => !!value)

DEFAULT_HANDLERS.set(Date, value => {

  if (!is(value, String, Number))
    return null

  const casted = new Date(value)
  return casted.toString() === 'Invalid Date'
    ? null
    : casted

})

DEFAULT_HANDLERS.set(Object, value => {

  return is.plainObject(value)
    ? value
    : null

})

freeze(DEFAULT_HANDLERS)

/******************************************************************************/
// Types
/******************************************************************************/

const ALL = [ ]

const methods = new Map()

resetToDefault()

/******************************************************************************/
// Exports
/******************************************************************************/

export default ALL

export { ALL, ANY }

export const DEFAULT = DEFAULT_TYPES

export function setCustom (Type, method) {

  if (!is(Type, Function))
    throw new Error('type argument must be a constructor.')

  // If a method wasn't supplied we'll supply a default
  if (!is(method))
    // If the type is a default type
    method = DEFAULT_TYPES.includes(Type)
      // We reset to the default handler for that type. This way, users can
      // define a custom caster for a default type, and then reset the caster
      // back to the default type without reseting all of their custom types
      ? DEFAULT_HANDLERS.get(Type)

      // Otherwise the default method for custom types is just to pass a primitive
      // value to the type as a constructor
      : value => Type(value)

  if (!is(method, Function))
    throw new Error('caster, if supplied, must be a function')

  if (!ALL.includes(Type))
    ALL.push(Type)

  methods.set(Type, method)
}

export function resetToDefault () {

  ALL.length = 0

  methods.clear()

  for (const type of DEFAULT_TYPES) {
    ALL.push(type)

    const method = DEFAULT_HANDLERS.get(type)
    if (method)
      methods.set(type, method)
  }

}

export function name (type) {
  if (type === ANY)
    return 'ANY'

  if (typeof type === 'function')
    return type.name || '(Anonymous Type)'

  return '(Invalid Type)'
}

export function assert (...args) {

  if (args.length < 2)
    throw new Error('types.assert() requires at least type to check and at least one type to check against')

  for (const type of args)
    if (!ALL.includes(type))
      throw new Error(`Unsupported Type: ${name(type)}`)

  const [ type, ...checkTypes ] = args

  if (!checkTypes.includes(type) && !checkTypes.includes(ANY))
    throw new Error(`Expected type: ${checkTypes.map(checkType => name(checkType))}`)
}

export function check (input, type, asArray) {

  if (!ALL.includes(type))
    throw new Error('invalid type argument.')

  const isArray = is(input, Array)
  const any = type === ANY
  const isDefined = is(input)
  const isExplicit = !any && isDefined

  if (asArray && !isArray && isExplicit)
    return `Expected array of ${name(type)}.`

  else if (!asArray && isArray && isExplicit)
    return `Expected single ${name(type)}.`

  const values = input::toArray()

  for (let i = 0; i < values.length; i++) {

    const value = values[i]
    /* eslint-disable indent */
    const error = is(value, Symbol)
      ? 'Cannot store a Symbol as a value.'

      // Neither can functions
      : is(value, Function)
      ? 'Cannot store a Function as a value.'

      // Nor should NaN
      : Number.isNaN(value)
      ? 'Cannot store NaN as a value.'

      // values of type Object should only apply for plain objects
      : type === Object && isDefined && !is.plainObject(value)
      ? `Expected ${asArray ? 'array of plain objects.' : 'a plain object.'}`

      // A typed value can equal null, meaning that it is optional. If a value
      // isn't null, and isn't of the type specified, it shouldn't pass validation
      : isExplicit && !is(value, type)
      ? `Expected ${asArray ? 'array of ' : ''}${name(type)}${asArray ? 's' : ''}.`

      // All remaining values either fit their type or are elligable for 'ANY'
      : false

    if (error)
      return error

  }
  /* eslint-enable indent */

  return false

}

export function cast (input, type, asArray) {

  if (!ALL.includes(type))
    throw new Error('invalid type argument.')

  const inputWasArray = is(input, Array)

  const values = input::toArray()
  const output = []

  for (const value of values) {

    // empty values, or values that shouldn't be cast at all, are returned as a null
    if (!is(value) || value === '' || is(value, Symbol, Function) || Number.isNaN(value))
      continue

    // If the value is already of the type specified, the value is considered casted.
    // Does not apply if type is Object, because this would ruin custom types.
    if (type !== Object && (type === ANY || is(value, type))) {
      output.push(value)
      continue
    }

    try {
      const casted = methods.get(type)(value)

      // in case of a custom cast, we have to check to ensure the value
      // is actually of the type it's supposed to cast, and also ensure
      // it didn't result in an empty string, which should be cast to null
      if (is(casted, type) && casted !== '')
        output.push(casted)

    } catch (err) {} // eslint-disable-line no-empty
  }

  // Whats this spaghetti? it satisfies all the edge cases:
  // asArray / input  /  sanitize  /  output
  // yes       null   => []        => null
  // yes       []     => []        => []
  // yes       fail   => []        => null
  // yes       pass   => [pass]    => [pass]
  // yes       [fail] => []        => []
  // yes       [pass] => [pass]    => [pass]
  // no        [pass] => [pass]    => pass
  // no        [fail] => []        => null
  // no        pass   => [pass]    => pass
  // no        fail   => []        => null

  return asArray && (inputWasArray || output.length > 0)
    ? output
    : is(output[0])
      ? output[0]
      : null
}
