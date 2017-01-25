import Schema from '../lib'
import { expect } from 'chai'

export function createSinglePropertySchemaa(prop) {
  return new Schema({ prop })
}

export function schemaShouldThrow(prop, error = Error) {
  expect(() => createSinglePropertySchemaa(prop))
    .to
    .throw(error)
}

export function schemaShouldNotThrow(prop, error = Error) {
  expect(() => createSinglePropertySchemaa(prop))
    .to
    .not
    .throw(error)
}
