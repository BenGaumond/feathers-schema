import { parseConfig } from '../helper'
import { assert } from '../types'
import is from 'is-explicit'

const PASS = false

export function required(...config) {

  const { condition, msg } = parseConfig(config, {
    condition: { type: Function, default: () => true },
    msg: { type: String, default: 'Required.'}
  })

  return async (value, params) => await condition(value, params)

    ? is(value) ? PASS : msg

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
  return value => !is(value) ? PASS

    //if the value exists in the values array, it passes
    : values.includes(value) ? PASS

    //otherwise it fails
    : msg || `Must be one of "${values.join(',')}"`
}
