import ObjectId from 'bson-objectid'
import { Buffer } from 'buffer'
import is from 'is-explicit'
import { NotImplemented } from 'feathers-errors'

export const ANY = null

const ALL = [
  String,
  Number,
  Boolean,
  Date,
  Buffer,
  Object,
  ObjectId,
  ANY
]

export default ALL

export { ALL }

export function cast(value, type) {

  if (type === ANY)
    return value

  if (is(value, type))
    return value

  switch (type) {

  case String:
    return !is(value, Object) ? String(value) : null

  case Number:
    return Number(value)

  case Boolean:
    return !!value

  case Date:
    return is(value, String, Number) ? new Date(value) : null

  case Buffer:
    return is(value, Array, String) ? Buffer.from(value) : null

  case Object:
    return null

  case ObjectId:
    return is(value, String) ? new ObjectId(value) : null

  default:
    throw new NotImplemented(`Cannot cast to ${type}`)

  }

}
