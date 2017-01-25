import { assert } from '../types'
import { array } from '../helper'
import is from 'is-explicit'

function stringSanitizer(func) {

  assert(this.type, String)

  return input => {

    input = array(input)
      .filter(str => is(str, String))
      .map(func)

    return array.unwrap(input, !this.array)
  }

}

export function lowercase() {

  return stringSanitizer
    .call(this, str => str.toLowerCase())
}

export function uppercase() {

  return stringSanitizer
    .call(this, str => str.toUpperCase())

}

export function trim() {

  return stringSanitizer
    .call(this, str => str.trim())

}
