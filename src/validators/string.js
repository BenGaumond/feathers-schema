import { parseConfig, rangeValidatorFactory, toArray, fromArray } from '../helper'
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

export function length (...config) {

  assert(this.type, String)

  return rangeValidatorFactory(config, str => str.length, DEFAULT_LENGTH_ERROR_MSGS)

}

export function format (...config) {

  assert(this.type, String)

  const { exp, msg } = parseConfig(config, {
    exp: { type: RegExp, required: true },
    msg: { type: String, default: 'Invalid format.' }
  })

  return input => {

    if (!is(input))
      return PASS

    const results = input::toArray()
      .map(item => exp.test(item) ? PASS : msg)

    return !this.array || results.every(result => !result)
      ? results::fromArray()
      : results

  }
}

const EMAIL_EXP =
  // eslint-disable-next-line no-useless-escape
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

export function email (...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'Invalid email.' }
  })

  return this::format({
    exp: EMAIL_EXP,
    msg
  })
}

const ALPHA_NUMERIC_EXP = /^\w+$/
export function alphanumeric (...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'May only contain letters and numbers.' }
  })

  return this::format({
    exp: ALPHA_NUMERIC_EXP,
    msg
  })
}

const ALPHA_EXP = /^[A-z]+$/
export function alpha (...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'May only contain letters.' }
  })

  return this::format({
    exp: ALPHA_EXP,
    msg
  })
}

const NUMERIC_EXP = /^[0-9]+$/
export function numeric (...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'May only contain numbers.' }
  })

  return this::format({
    exp: NUMERIC_EXP,
    msg
  })
}

const NO_SPACES_EXP = /^\S*$/
export function nospaces (...config) {

  const { msg } = parseConfig(config, {
    msg: { type: String, default: 'May not contain any spaces.' }
  })

  return this::format({
    exp: NO_SPACES_EXP,
    msg
  })
}
