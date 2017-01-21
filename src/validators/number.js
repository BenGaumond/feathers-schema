import { parseConfig, rangeValidatorFactory } from '../helper'
import { assert } from '../types'
import is from 'is-explicit'

const PASS = false

export function range(...config) {

  assert(this.type, Number)

  return rangeValidatorFactory(config)

}

export function even(...config) {

  assert(this.type, Number)

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'Must be even.'}
  })

  return value => !is(value)
    ? PASS
    : value % 2 === 0
      ? PASS
      : msg
}

export function odd(...config) {

  assert(this.type, Number)

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'Must be odd.'}
  })

  return value => !is(value)
    ? PASS
    : value % 2 === 1
      ? PASS
      : msg
}
