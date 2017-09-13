import { assert } from '../types'
import { toArray, fromArray } from '../helper'
import is from 'is-explicit'

function stringSanitizer (func) {

  assert(this.type, String)

  return input => {

    input = input::toArray()
      .filter(str => is(str, String))
      .map(func)

    return this.array
      ? input
      : input::fromArray()
  }

}

export function lowercase () {

  return this::stringSanitizer(str => str.toLowerCase())
}

export function uppercase () {

  return this::stringSanitizer(str => str.toUpperCase())

}

export function trim () {

  return this::stringSanitizer(str => str.trim())

}
