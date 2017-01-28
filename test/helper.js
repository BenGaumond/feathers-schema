import Schema from '../src'
import { expect } from 'chai'

export function createSinglePropertySchema(prop) {
  return new Schema({ prop })
}

export function schemaShouldThrow(prop, error = Error) {
  expect(() => createSinglePropertySchema(prop))
    .to
    .throw(error)
}

export function schemaShouldNotThrow(prop, error = Error) {
  expect(() => createSinglePropertySchema(prop))
    .to
    .not
    .throw(error)
}
