import { parseConfig, rangeValidatorFactory, array } from '../helper'
import { assert } from '../types'
import is from 'is-explicit'

const PASS = false

const DEFAULT_LENGTH_ERROR_MSGS = {
  '<=': number => `Must have ${number} or less characters.`,
  '<': number => `Must have less than ${number} characters.`,
  '>': number => `Must have more than ${number} characters.`,
  '>=': number => `Must have ${number} or more characters.`,
  '<=>': (min, max) => `Must have between ${min} and ${max} characters.`
}

export function length(...config) {

  assert(this.type, String)

  return rangeValidatorFactory(config, str => str.length, DEFAULT_LENGTH_ERROR_MSGS)

}

export function format(...config) {

  assert(this.type, String)

  const { exp, msg } = parseConfig(config, {
    exp: { type: RegExp, required: true },
    msg: { type: String, default: 'Invalid format.' }
  })

  return input => {

    if (!is(input))
      return PASS

    const results = array(input)
      .map(item => exp.test(item) ? PASS : msg)

    return array
      .unwrap(
        results,
        !this.array || results.every(result => result == PASS)
      )
  }
}

const EMAIL_EXP =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
export function email(...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'Invalid email.'}
  })

  return format.call(this, {
    exp: EMAIL_EXP,
    msg
  })
}

const ALPHA_NUMERIC_EXP = /^\w+$/
export function alphanumeric(...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'May only contain letters and numbers.'}
  })

  return format.call(this, {
    exp: ALPHA_NUMERIC_EXP,
    msg
  })
}

const ALPHA_EXP = /^[A-z]+$/
export function alpha(...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'May only contain letters.'}
  })

  return format.call(this, {
    exp: ALPHA_EXP,
    msg
  })
}

const NUMERIC_EXP = /^[0-9]+$/
export function numeric(...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'May only contain numbers.'}
  })

  return format.call(this, {
    exp: NUMERIC_EXP,
    msg
  })
}

const NO_SPACES_EXP = /^\S*$/
export function nospaces(...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'May not contain any spaces.' }
  })

  return format.call(this, {
    exp: NO_SPACES_EXP,
    msg
  })
}
