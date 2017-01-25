import { parseConfig, array } from '../helper'
import { assert } from '../types'
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
