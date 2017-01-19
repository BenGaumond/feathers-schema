import { checkType, parseConfig, createErrorMessager } from '../helper'
import is from 'is-explicit'

const PASS = false

export function required(...config) {

  let { condition, msg } = parseConfig(config, 'condition', 'msg')

  //required allows a 'condition' function.
  //if it returns true, the value is required.
  if (!is(condition, Function))
    condition = () => true

  msg = createErrorMessager(msg, 'Required.')

  return (value, params) => condition(value, params)

    ? is(value) ? PASS : msg(value, params)

    : PASS
}

export function _enum(...config) {

  let { values, msg } = parseConfig(config, 'values', 'msg') //eslint-disable-line prefer-const

  checkType(this.type, [String, Number], 'enum')

  if (!is(values, Array) || !values.every(v => is(v, this.type)))
    throw new Error(`enum requires an array of ${this.type.name} values.`)

  msg = createErrorMessager(msg, `Must be one of "${values.join(',')}"`)

  //null values pass
  return (value, params) => !is(value) ? PASS

    //if the value exists in the values array, it passes
    : values.includes(value) ? PASS

    //otherwise it fails
    : msg(value, params)
}
