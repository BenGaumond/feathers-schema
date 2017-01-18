import ObjectId from 'bson-objectid'
import { Buffer } from 'buffer'
import is from 'is-explicit'
import { isPlainObject } from './helper'

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
  Object,
  ObjectId,
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

  return is(value, String)
    ? new ObjectId(value)
    : null

})

freeze(DEFAULT_METHODS)

/******************************************************************************/
// Types
/******************************************************************************/

const ALL = [ ]

const methods = new Map()

reset()

/******************************************************************************/
// Exports
/******************************************************************************/

export default ALL

export { ALL, ANY }

export function setCustomCast(type, method) {

  if (!is(type, Function))
    throw new Error('type argument must be a constructor.')

  if (!is(method, Function))
    throw new Error('must supply a casting function')

  if (!ALL.includes(type))
    ALL.push(type)

  methods.set(type, method)
}

export function reset() {

  ALL.length = 0

  methods.clear()

  for (const type of DEFAULT_TYPES) {
    ALL.push(type)

    const method = DEFAULT_METHODS.get(type)
    if (method)
      methods.set(type, method)
  }

}

export function cast(value, type) {

  if (!ALL.includes(type))
    throw new Error('invalid type argument.')

  //empty strings and undefined are cast to null, and null values are considered
  //casted to type. By default, null values pass type checks.
  if (!is(value) || value === '')
    return null

  //If the value is already of the type specified, the value is considered casted.
  //Does not apply if type is Object, because this would ruin custom types.
  if (type !== Object && (type === ANY || is(value, type)))
    return value

  try {

    const casted = methods.get(type)(value)

    //in case of a custom cast, we have to check to ensure the value
    //is actually of the type it's supposed to cast, and also ensure
    //it didn't result in an empty string, which should be cast to null
    return is(casted, type) && casted !== ''
      ? casted
      : null

  } catch (err) {

    return null

  }

}
