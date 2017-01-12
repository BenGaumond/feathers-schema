
import is from 'is-explicit'
import { compareId, getIn, checkErrorMsg, parseConfigArgs } from '../helper'

export function _default(...config) {

  const { defaultValue } = parseConfigArgs(config, 'defaultValue')

  //create a function out of the defaultValue, so that functions could be passed in
  const getDefaultValue = is(defaultValue, Function)
    ? defaultValue
    : () => defaultValue

  return (value, params) => is(value)
    ? value
    : getDefaultValue(params)

}
