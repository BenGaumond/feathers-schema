import { parseConfig, rangeValidatorFactory, toArray, fromArray } from '../helper'
import { assert } from '../types'
import is from 'is-explicit'

const PASS = false

export function range (...config) {

  assert(this.type, Number)

  return rangeValidatorFactory(config)

}

export function even (...config) {

  assert(this.type, Number)

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'Must be even.' }
  })

  return input => {
    if (!is.defined(input))
      return PASS

    const results = input::toArray()
      .map(item => item % 2 === 0 ? PASS : msg)

    return !this.array || results.every(result => !result)
      ? results::fromArray()
      : results

  }
}

export function odd (...config) {

  assert(this.type, Number)

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'Must be odd.' }
  })

  return input => {
    if (!is.defined(input))
      return PASS

    const results = input::toArray()
      .map(item => item % 2 === 1 ? PASS : msg)

    return !this.array || results.every(result => !result)
      ? results::fromArray()
      : results
  }
}
