import { parseConfig } from '../helper'
import { assert } from '../types'
import is from 'is-explicit'

const PASS = false

// TODO gotta figure out how to make this not a pain in the ass
// export function length(...config) {
//
//   assert(this.type, String)
//
//   let { min, max, compare, msg} = parseConfig(config, {
//     min: { type: Number, default: -Infinity },
//     max: { type: Number, default: Infinity },
//     compare: { type: String, default: '<=>' },
//     msg: String
//   })
//
//   if (isFinite(min) && isFinite(max) && compare !== '<=>')
//     throw new Error('compare ')
//
//   ;[min, max] = min <= max ? [min, max] : [max, min]
//
//   msg = msg ? msg
//     : compare === '<=' ? `Must be equal to or less than ${max} characters.`
//     : compare === '<' ? `Must be less than ${max} characters.`
//     : compare === '>' ? `Must be more than ${min} characters.`
//     : compare === '>=' ? `Must be equal to or more than ${min} characters.`
//     : /*compare === '<=>'*/ `Must be between ${min} and ${max} characters.`
//
// }

export function format(...config) {

  assert(this.type, String)

  const { regEx, msg } = parseConfig(config, {
    regEx: { type: RegExp, required: true },
    msg: { type: String, default: 'Invalid format.' }
  })

  return value =>

    !is(value) ? PASS :

    regEx.test(value) ? PASS : msg

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
