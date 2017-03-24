import ObjectId from 'bson-objectid'
import { Buffer } from 'buffer'
import is from 'is-explicit'
import { isPlainObject, array } from './helper'

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
  Buffer,
  ObjectId,
  Object,
  ANY
])

/******************************************************************************/
// Casting Methods
/******************************************************************************/

const DEFAULT_METHODS = new Map()

DEFAULT_METHODS.set(String, value => {

  return is(value, Object) && 'toString' in value
     ? value.toString()
     : String(value)

})

DEFAULT_METHODS.set(Number, value => {

  return is(value, Object)
    ? 'valueOf' in value ? value.valueOf() : null
    : Number(value)

})

DEFAULT_METHODS.set(Boolean, value => !!value)

DEFAULT_METHODS.set(Date, value => {

  if (!is(value, String, Number))
    return null

  const casted = new Date(value)
  return casted.toString() === 'Invalid Date'
    ? null
    : casted

})

DEFAULT_METHODS.set(Buffer, value => {

  return is(value, Array, String)
    ? Buffer.from(value)
    : null

})

DEFAULT_METHODS.set(Object, value => {

  return isPlainObject(value)
    ? value
    : null

})

DEFAULT_METHODS.set(ObjectId, value => {

  return new ObjectId(String(value))

})

freeze(DEFAULT_METHODS)

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

export { ALL, ANY, ObjectId, Buffer }

export const DEFAULT = DEFAULT_TYPES

export function setCustom(type, method) {

  if (!is(type, Function))
    throw new Error('type argument must be a constructor.')

  if (!is(method, Function))
    throw new Error('must supply a casting function')

  if (!ALL.includes(type))
    ALL.push(type)

  methods.set(type, method)
}

export function resetToDefault() {

  ALL.length = 0

  methods.clear()

  for (const type of DEFAULT_TYPES) {
    ALL.push(type)

    const method = DEFAULT_METHODS.get(type)
    if (method)
      methods.set(type, method)
  }

}

export function name(type) {
  return type === ANY ? 'ANY' : type.name
}

export function assert(type, ...validTypes) {

  for (const validType of validTypes)
    if (!ALL.includes(validType))
      throw new Error(`Unsupported Type: ${name(validType)}`)

  if (!validTypes.includes(type))
    throw new Error(`Expected type: ${validTypes.map(validType => name(validType))}`)
}

export function check(input, type, asArray) {

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

  const values = array(input)

  for (let i = 0; i < values.length; i++) {

    const value = values[i]

    const error = is(value, Symbol)
      ? 'Cannot store a Symbol as a value.'

      //Neither can functions
      : is(value, Function)
      ? 'Cannot store a Function as a value.'

      //Nor should NaN
      : Number.isNaN(value)
      ? 'Cannot store NaN as a value.'

      //values of type Object should only apply for plain objects
      : type === Object && isDefined && !isPlainObject(value)
      ? `Expected ${asArray ? 'array of plain objects.' : 'a plain object.'}`

      //A typed value can equal null, meaning that it is optional. If a value
      //isn't null, and isn't of the type specified, it shouldn't pass validation
      : isExplicit && !is(value, type)
      ? `Expected ${asArray ? 'array of ' : ''}${name(type)}${asArray ? 's' : ''}.`

      //All remaining values either fit their type or are elligable for 'ANY'
      : false

    if (error)
      return error

  }

  return false

}

export function cast(input, type, asArray) {

  if (!ALL.includes(type))
    throw new Error('invalid type argument.')

  const inputWasArray = is(input, Array)

  const values = array(input)
  const output = []

  for (const value of values) {

    //empty values, or values that shouldn't be cast at all, are returned as a null
    if (!is(value) || value === '' || is(value, Symbol, Function) || Number.isNaN(value))
      continue

    //If the value is already of the type specified, the value is considered casted.
    //Does not apply if type is Object, because this would ruin custom types.
    if (type !== Object && (type === ANY || is(value, type))) {
      output.push(value)
      continue
    }

    try {
      const casted = methods.get(type)(value)

      //in case of a custom cast, we have to check to ensure the value
      //is actually of the type it's supposed to cast, and also ensure
      //it didn't result in an empty string, which should be cast to null
      if (is(casted, type) && casted !== '')
        output.push(casted)

    } catch (err) {} //eslint-disable-line no-empty
  }

  //whats this spaghetti? it satisfies all the edge cases:
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
