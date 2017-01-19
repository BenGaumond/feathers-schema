import { parseConfig, checkType } from '../helper'
import is from 'is-explicit'

export function lowercase() {

  checkType(this.type, String, 'lowercase')

  return value => is(value, String) ? value.toLowerCase() : value

}

export function uppercase() {

  checkType(this.type, String, 'uppercase')

  return value => is(value, String) ? value.toUpperCase() : value

}

export function trim() {

  checkType(this.type, String, 'trim')

  return value => is(value, String) ? value.trim() : value

}
