import ObjectId from 'bson-objectid'
import Buffer from 'buffer'

const TYPES = [
  String,
  Number,
  Boolean,
  Date,
  Buffer,
  Object,
  ObjectId,
  Buffer
]

export default TYPES

export function cast(from, to) {

}

// export function castTo(value, type) {
//
//   if (is(value, type))
//     return value
//
//   switch (type) {
//
//   case String:
//     return !is(value, Object) ? String(value) : value
//
//   case Number:
//     return parseFloat(value)
//
//   case Boolean:
//     return !!value
//
//   case Date:
//     return is(value, String, Number) ? new Date(value) : value
//
//   case ObjectId:
//     return is(value, String) ? new ObjectId(value) : value
//
//   default:
//     throw new NotImplemented(`Cannot cast to ${type}`)
//
//   }
// }
