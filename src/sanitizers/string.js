import { assert } from '../types'
import is from 'is-explicit'

export function lowercase() {

  assert(this.type, String)

  return value => is(value, String) ? value.toLowerCase() : value

}

export function uppercase() {

  assert(this.type, String)

  return value => is(value, String) ? value.toUpperCase() : value

}

export function trim() {

  assert(this.type, String)

  return value => is(value, String) ? value.trim() : value

}
