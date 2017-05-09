import { assert } from 'chai'
import Schema from '../../src'
import { createSinglePropertySchema, schemaShouldThrow, schemaShouldNotThrow } from '../helper'

/* global describe it */

async function testSchema (schema, value, expected) {

  const result = await schema.sanitize({ prop: value })
  return assert.deepEqual(result, { prop: expected })

}

describe('Stock General Sanitizers', () => {

  describe('default', () => {
    it('sets a default value, if initial value is null', () => {

      const def = 'Somebody'
      const schema = createSinglePropertySchema({
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

      const schema = createSinglePropertySchema({
        type: Number,
        default: () => def
      })

      return testSchema(schema, null, def)

    })

    it('handles arrays', async () => {

      const def = [0,1,2,3,4]

      const schema = createSinglePropertySchema([{
        type: Number,
        default: def
      }])

      return testSchema(schema, 'wtf is this shit', def)

    })

    it('function value config is handled correctly in array properties', async () => {

      const schema = createSinglePropertySchema([{
        type: Number,
        default: () => 100
      }])

      return testSchema(schema, null, [100])

    })

    it('handles nested objects', async () => {

      const schema = new Schema({

        name: {
          first: { String, default: 'Jane'},
          last: { String, default: 'Doe'},
          default: () => new Object()
        }

      })

      const results = await schema.sanitize({})

      assert.deepEqual(results, { name: { first: 'Jane', last: 'Doe' }})

    })
  })
})

describe('Stock String Sanitizers', () => {

  describe('lowercase', () => {

    it('lowers the case of string values', () => {

      const schema = createSinglePropertySchema({
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

    it('handles arrays', async () => {
      const schema = createSinglePropertySchema([{
        type: String,
        lowercase: true
      }])

      const value = ['FUCK', 'YEAH', 'BRO']

      return testSchema(schema, value, value.map(str => str.toLowerCase()))
    })

  })

  describe('uppercase', () => {

    it('ups the case of string values', () => {

      const schema = createSinglePropertySchema({
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

    it('handles arrays', async () => {
      const schema = createSinglePropertySchema([{
        type: String,
        uppercase: true
      }])
      const value = ['i', 'wanna', 'be', 'louder']

      return testSchema(schema, value, value.map(str => str.toUpperCase()))
    })

  })

  describe('trim', () => {

    it('trim string values of whitespace', () => {

      const schema = createSinglePropertySchema({
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


    it('handles arrays', async () => {
      const schema = createSinglePropertySchema([{
        type: String,
        trim: true
      }])
      const value = [' too   ', '  much\t\t\n  ', '   whitespace     ']

      return testSchema(schema, value, value.map(str => str.trim()))
    })

  })

})
