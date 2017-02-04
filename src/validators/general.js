import { parseConfig, array, getIn } from '../helper'
import { assert, ObjectId } from '../types'
import is from 'is-explicit'

const PASS = false

export function required(...config) {

  const { condition, msg } = parseConfig(config, {
    condition: { type: Function, default: () => true },
    msg: { type: String, default: 'Required.'}
  })

  return async (value, params) => await condition(value, params)

    //condition says value is required
    ? is(value)

      //value exists but this property is an array
      ? this.array

        //zero length arrays don't pass
        ? value.length > 0
          ? PASS
          : msg

        : PASS

      //value doesn't exist
      : msg

    //condition says that the value isn't required
    : PASS

}

export function _enum(...config) {

  assert(this.type, String, Number)

  const { values, msg } = parseConfig(config, {
    values: { type: Array, required: true },
    msg: String
  })

  if (!values.every(v => is(v, this.type)))
    throw new Error(`enum requires an array of ${this.type.name} values.`)

  //null values pass
  return input => {

    if (!is(input))
      return PASS

    //in case of array, we check every item to see if it's included in the enumeration
    const results = array(input)
      .map(item => values.includes(item) ? PASS : msg || `Must be one of "${values.join(',')}"`)

    //only return an array of results if there are errors and this property is an array property
    return array.unwrap(results, !this.array || results.every(result => result == PASS))
  }
}

export function unique(...config) {

  assert(this.type, ObjectId, String, Number)


  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'Must be unique.'}
  })

  const path = []
  let curr = this

  //path, in this context, is an array containing the chain of keys
  //that will find the value of this property on a given data object.
  //so: { foo: { bar: value } } would result ['foo', 'bar']
  do {

    path.unshift(curr.key)

    if (curr.array)
      throw new Error('Currently, unique validators can\'t be placed on array '+
      'properties, or descendants of array properties.')

    curr = curr.parent

  } while (curr)

  //unfortunately, feathers cannot query nested properties.
  //(Or at least, all database adapters can't)
  //If the path is nested, we need to find every document in the service,
  //and check them. To save time on non-nested properties, unique validators
  //are supplied with a different function depending on their path
  const existing = path.length > 1
    ? async (service, query, input) => {

      const docs = await service.find({query})

      let count = 0
      for (const doc of docs) {
        if (getIn(doc, path) === input)
          count++
      }

      return count
    }

    : async (service, query, input) => {
      query[this.key] = input

      const docs = await service.find({query})

      return docs.length
    }


  return async (input, { service, id, method }) => {

    //Undefined values pass.
    //Also, this validator depends on access to server parameters.
    //if this validator is being run client side, they wont exist.
    //In that case, this validator will just pass.
    if (!is(input) || !is(service, Object))
      return PASS

    const query = { }

    if (method !== 'create') //id wont exist if this is a create
      query[service.id] = { $ne: id }

    const count = await existing(service, query, input)

    return count === 0 ? PASS : msg

  }

}
