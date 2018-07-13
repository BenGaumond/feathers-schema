import { parseConfig, idsMatch, toArray, fromArray, getIn } from '../helper'
import { assert } from '../types'
import is from 'is-explicit'

const PASS = false

export function required (...config) {

  const { condition, msg } = parseConfig(config, {
    condition: { type: Function, default: () => true },
    msg: { type: String, default: 'Required.' }
  })

  return async (value, params) => await condition(value, params)

    // condition says value is required
    ? is.defined(value)

      // value exists but this property is an array
      ? this.array

        // zero length arrays don't pass
        ? value.length > 0
          ? PASS
          : msg

        : PASS

      // value doesn't exist
      : msg

    // condition says that the value isn't required
    : PASS

}

export function _enum (...config) {

  assert(this.type, String, Number)

  const { values, msg } = parseConfig(config, {
    values: { type: Array, required: true },
    msg: String
  })

  if (!values.every(v => is(v, this.type)))
    throw new Error(`enum requires an array of ${this.type.name} values.`)

  // null values pass
  return input => {

    if (!is.defined(input))
      return PASS

    // in case of array, we check every item to see if it's included in the enumeration
    const results = input::toArray()
      .map(item => values.includes(item) ? PASS : msg || `Must be one of "${values.join(',')}"`)

    // only return an array of results if there are errors and this property is an array property
    return !this.array || results.every(result => !result)
      ? results::fromArray()
      : results

  }
}

export function unique (...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'Must be unique.' }
  })

  const path = []
  let curr = this

  // path, in this context, is an array containing the chain of keys
  // that will find the value of this property on a given data object.
  // so: { foo: { bar: value } } would result ['foo', 'bar']
  do {

    path.unshift(curr.key)

    if (curr.array)
      throw new Error('Currently, unique validators can\'t be placed on array ' +
      'properties, or descendants of array properties.')

    curr = curr.parent

  } while (curr)

  return async (input, { service, method, id }) => {

    // Undefined values pass.
    // Also, this validator depends on access to server parameters.
    // if this validator is being run client side, they wont exist.
    // In that case, this validator will just pass.
    if (!is.defined(input) || !is(service, Object))
      return PASS

    // unfortunately, feathers cannot query nested properties.
    // (Or at least, all database adapters can't)
    // If the path is nested, we need to find every document in the service,
    // and check them. To be more efficient on non-nested properties,
    // we can supply a query.
    const query = path.length === 1 ? { [this.key]: input } : null

    let docs = await service.find({ query, paginate: false })

    // if this an update or patch, we need to filter the existing doc from the
    // results, otherwise we'll get a false positive
    if (method !== 'create')
      docs = docs.filter(doc => !idsMatch(id, doc[service.id]))

    // if there are any docs left after this filter, it means the input value
    // is not unique
    docs = docs.filter(doc => getIn(doc, path) === input)

    return docs.length > 0 ? msg : PASS

  }

}
