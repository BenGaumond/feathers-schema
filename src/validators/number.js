import { parseConfig, rangeValidatorFactory, array } from '../helper'
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

  return input => {
    if (!is(input))
      return PASS

    const results = array(input)
      .map(item => item % 2 === 0 ? PASS : msg)

    return array.unwrap(
      results,
      !this.array || results.every(result => result == PASS)
    )

  }
}

export function odd(...config) {

  assert(this.type, Number)

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'Must be odd.'}
  })

  return input => {
    if (!is(input))
      return PASS

    const results = array(input)
      .map(item => item % 2 === 1 ? PASS : msg)

    return array.unwrap(
      results,
      !this.array || results.every(result => result == PASS)
    )
  }
}
