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

  const { regEx, msg } = parseConfig(config, {
    regEx: { type: RegExp, required: true },
    msg: { type: String, default: 'Invalid format.' }
  })

  return input => {

    if (!is(input))
      return PASS

    const results = array(input)
      .map(item => regEx.test(item) ? PASS : msg)

    return array
      .unwrap(
        results,
        !this.array || results.every(result => result == PASS)
      )
  }
}

const EMAIL_REGEX =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
export function email(...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'Invalid email.'}
  })

  return format.call(this, {
    regEx: EMAIL_REGEX,
    msg
  })
}

const ALPHA_NUMERIC_REGEX = /^\w+$/
export function alphanumeric(...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'May only contain letters and numbers.'}
  })

  return format.call(this, {
    regEx: ALPHA_NUMERIC_REGEX,
    msg
  })
}

const NO_SPACES_REGEX = /^\S*$/
export function nospaces(...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'May not contain any spaces.' }
  })

  return format.call(this, {
    regEx: NO_SPACES_REGEX,
    msg
  })
}
