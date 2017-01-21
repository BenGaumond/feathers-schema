import Schema from '../../lib'
import { expect } from 'chai'

export function createSchema(prop) {
  return new Schema({ prop })
}

export function schemaShouldThrow(prop, error = Error) {
  expect(() => createSchema(prop))
    .to
    .throw(error)
}

export function schemaShouldNotThrow(prop, error = Error) {
  expect(() => createSchema(prop))
    .to
    .not
    .throw(error)
}
