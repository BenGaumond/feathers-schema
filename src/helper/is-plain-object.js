import is from 'is-explicit'

export default function isPlainObject(obj) {

  return is(obj, Object) && obj.constructor === Object

}
