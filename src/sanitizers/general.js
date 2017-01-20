import { parseConfig } from '../helper'
import is from 'is-explicit'

export function _default(...config) {

  const { value } = parseConfig(config, {
    value: { type: [Function, this.type], required: true }
  })

  const getDefault = is(value, Function) ? value : () => value

  return (value, params) => is(value)
    ? value
    : getDefault(params)

}
