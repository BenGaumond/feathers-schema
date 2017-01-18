import Schema, { types } from '../../lib'
import { assert, expect  } from 'chai'
import is from 'is-explicit'

/* global describe it */

function createSchema(prop) {
  return new Schema({ prop })
}

function schemaShouldThrow(prop, error = Error) {
  expect(() => createSchema(prop))
    .to
    .throw(error)
}

function schemaShouldNotThrow(prop, error = Error) {
  expect(() => createSchema(prop))
    .to
    .not
    .throw(error)
}

function schemaEquivalent(a, b, ...data) {
  const sa = createSchema(a)
  const sb = createSchema(b)

  return Promise.all(data.map(async prop => {

    const ra = await sa.sanitize({prop})
    const rb = await sb.sanitize({prop})

    return assert.deepEqual(ra, rb)

  }))

}


async function testSchema (schema, value, expected) {

  const result = await schema.sanitize({ prop: value })

  return assert.deepEqual(result, { prop: expected })

}

describe('Stock General Sanitizers', () => {

  describe('default', () => {
    it('sets a default value, if initial value is null', () => {

      const def = 'Somebody'
      const schema = createSchema({
        type: String,
        default: def
      })

      return Promise
        .all(['Kelly', NaN, 'Robert', 'Steve', null, 'Candice']
          .map(value => testSchema(schema, value, value || def)
        ))
    })

    it('takes a \'value\' config, which can be of its property type or a function that returns a value', async () => {

      const def = 100

      await schemaShouldThrow({
        type: String,
        default: def
      })

      await schemaShouldThrow({
        type: String,
        default: { wrongKey: 'Foobar'}
      })

      await schemaShouldNotThrow({
        type: Number,
        default: { value: def }
      })

      const schema = createSchema({
        type: Number,
        default: () => def
      })

      return testSchema(schema, null, def)

    })
  })
})

describe('Stock String Sanitizers', () => {

  describe('lowercase', () => {

    it('lowers the case of string values', () => {

      const schema = createSchema({
        type: String,
        lowercase: true
      })

      return Promise
        .all(['CASE', 'FooBar', '!@#$%^', '102031']
          .map(value => testSchema(schema, value, value.toLowerCase())
        ))

    })

    it('can only be applied to string properties', async () => {
      await schemaShouldThrow({type: Number, lowercase: true})
      return schemaShouldNotThrow({type: String, lowercase: true})
    })

  })

  describe('uppercase', () => {

    it('ups the case of string values', () => {

      const schema = createSchema({
        type: String,
        uppercase: true
      })

      return Promise
        .all(['case', 'foobar', '!@#$%^', '102031']
          .map(value => testSchema(schema, value, value.toUpperCase())
        ))

    })

    it('can only be applied to string properties', async () => {
      await schemaShouldThrow({type: Number, lowercase: true})
      return schemaShouldNotThrow({type: String, lowercase: true})
    })

  })

})
