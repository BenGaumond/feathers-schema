import { assert  } from 'chai'

import { createSchema, schemaShouldThrow, schemaShouldNotThrow } from './helper'

/* global describe it */

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

      await schemaShouldNotThrow({
        type: Number,
        default: def
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

  describe('trim', () => {

    it('trim string values of whitespace', () => {

      const schema = createSchema({
        type: String,
        trim: true
      })

      return Promise
        .all(['  case ', '  foobar \n', ' !@#$%^ ', ' 102031']
          .map(value => testSchema(schema, value, value.trim())
        ))

    })

    it('can only be applied to string properties', async () => {
      await schemaShouldThrow({type: Number, trim: true})
      return schemaShouldNotThrow({type: String, trim: true})
    })

  })

})
