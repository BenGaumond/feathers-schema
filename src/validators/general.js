import { parseConfig, checkErrorMsg } from '../helper'
import is from 'is-explicit'

export function required(...config) {

  let { condition, msg } = parseConfig(config, 'condition', 'msg')

  //required allows a 'condition' function.
  //if it returns true, the value is required.
  if (!is(condition, Function))
    condition = () => true

  msg = checkErrorMsg(msg, 'Required.')

  return (value, params) => condition(value, params)

    ? is(value) ? false : msg

    : false
}
