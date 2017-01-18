import { parseConfig } from '../helper'
import { ANY } from '../types'
import is from 'is-explicit'

export function _default(...config) {

  const { value } = parseConfig(config, 'value')

  const isFunc = is(value, Function)

  if (this.type !== ANY && !isFunc && !is(value, this.type))
    throw new Error('default sanitizer must be initialized with a value of the same type as the property.')

  const getDefault = isFunc ? value : () => value

  return (value, params) => is(value)
    ? value
    : getDefault(params)

}
