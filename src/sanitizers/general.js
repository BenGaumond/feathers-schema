import { parseConfig, array } from '../helper'
import { name, assert, ObjectId } from '../types'
import is from 'is-explicit'

//TODO parse sanitizer. Parse sanizer will only invoke when a value doesn't
//pass type casting. It'll take a function that takes an invalid value and allow
//users to convert it. As of NOW, all values pass type casting, uncastable ones
//reduced to null, which is a legal value (unless using the required validator)
//I'll change that behaviour before implenting parse()
// export function parse() {}

export function _default(...config) {

  let { value } = parseConfig(config, {
    value: { type: [Function, this.array ? Array : this.type ], required: true }
  })

  value = array(value, this.array)

  if (this.array && is(value[0], Function))
    value = value[0]

  if (this.type && this.array && is(value, Array) && !value.every(v => is(v, this.type)))
    throw new Error(`Must be an Array of ${name(this.type)}`)

  const getDefault = is(value, Function)
    ? value
    : () => value

  return async (input, params) => !is(input) || is(input, Array) && input.length === 0
    ? await getDefault(params)
    : input

}

export function service(...config) {

  const { name } = parseConfig(config, {
    name: { type: String, required: true }
  })

  //service validator can only be used with types than can be used as an id
  assert(this.type, String, ObjectId, Number)

  //we need a special indexOf function to test for existence of ids,
  //because ObjectId's wont pass the standard array.indexOf test
  const indexOf = (id, arr) => {

    if (!this.type.prototype.equals)
      return arr.indexOf(id)

    for (let i = 0; i < arr.length; i++)
      if (arr[i].equals(id))
        return i

    return -1
  }

  return async (input, { app }) => {

    //Undefined values pass.
    //Also, this sanitizer depends on access to server parameters.
    //if this validator is being run client side, they wont exist.
    //In that case, this sanitizer wont mutate the input.
    if (!is(input) || !is(app, Object))
      return input

    const service = app.service(name)
    const ids = array(input)
    const query = {
      [service.id]: { $in: ids }
    }

    const docs = await service.find({query})

    const all = docs.map(doc => doc[service.id]),
      output = []

    for (const id of ids) {
      const i = indexOf(id, all)
      if (i < 0)
        continue

      //remove the id from the all array, speeding up the process and
      //preventing duplicates
      all.splice(i, 1)

      output.push(id)
    }

    //only return an array if this is an array property
    return array.unwrap(output, !this.array)
  }

}
