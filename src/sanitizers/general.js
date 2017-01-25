import { parseConfig } from '../helper'
import { name } from '../types'
import is from 'is-explicit'

export function _default(...config) {

  const { value } = parseConfig(config, {
    value: { type: [Function, this.array ? Array : this.type ], required: true }
  })

  if (this.type && is.array && is(value, Array) && !value.every(v => is(v, this.type)))
    throw new Error(`Must be an Array of ${name(this.type)}`)

  const getDefault = is(value, Function) ? value : () => value

  return (input, params) => is(input)
    ? input
    : getDefault(params)

}
