
import Schema, { types } from '../../src'
import { isPlainObject } from '../../src/helper'
import { assert  } from 'chai'
import is from 'is-explicit'
import ObjectId from 'bson-objectid'


/* global describe it */

function createValidator(obj, key = 'prop') {
  const schema = new Schema(obj)
  const property = schema.properties[key]

  const validator = property.validate.bind(property)
  validator.type = property.type
  validator.array = property.array

  return validator
}

function createSanitizer(obj, key = 'prop') {
  const schema = new Schema(obj)
  const property = schema.properties[key]

  const sanitizer = property.sanitize.bind(property)
  sanitizer.type = property.type
  sanitizer.array = property.array

  return sanitizer
}

const stringify = val => is(val, Symbol) ? `:${val.toString()}` :
  is(val, Buffer) ? `<${[...val.values()]}>` :
  val === '' ? 'empty string' :
  is(val, Array) ? `[${val.map(v => stringify(v))}]` :
  is(val, String) ? `"${val}"` :
  is(val, ObjectId) ? `@${val}` :
  is(val, Function) ? '()=>{}' :
  is(val, Date) ? `|${val.toString()}|` :
  is(val, Object) ? `{${Object.keys(val)}}` :
  val

const validatorResult = val => val ? 'FAIL' : 'PASS'

async function testValidator(validator, value, expected) {

  const passOrFail = await validator(value)
  assert.equal(validatorResult(passOrFail), validatorResult(expected))
}

async function testSanitizer(sanitizer, value, expected) {

  const sanitized = await sanitizer(value)
  assert.deepEqual(sanitized, expected)
}


async function equivalentValidatorOutput(v1, v2) {

  return Promise.all(['string', null, undefined, 10, {}, [{}], [], ['string'], [100], true, [false], Symbol(), [Symbol()], Infinity,  NaN]
    .map(async value => {
      const r1 = await v1(value)
      const r2 = await v2(value)

      assert.equal(v1.type, v2.type)

      return assert.deepEqual(r1,r2)
    }))

}

describe('Property Definitions', () => {

  describe('Property of a specific type:', () => {

    const original = createValidator({ prop: Number })

    it('Quick notation: { prop: Number }', () => {
      const type = createValidator({ prop: Number })

      return equivalentValidatorOutput(original, type)
    })

    it('Short notation: { prop: { Number } }', () => {
      const plain = createValidator({ prop: { Number } })
      return equivalentValidatorOutput(original, plain)
    })

    it('Type notation: \t{ prop: { type: Number } }', () => {
      const plain = createValidator({ prop: { type: Number } })
      return equivalentValidatorOutput(original, plain)
    })


  })

  describe('Property of an array of a specific type:', () => {

    const original = createValidator({ prop: [Number] })

    it('Quick notation: { prop: [Number] }', () => {
      const type = createValidator({ prop: [Number] })
      return equivalentValidatorOutput(original, type)
    })

    it('Short notation: { prop: [{ Number }] }', () => {
      const type = createValidator({ prop: [{ Number }] })
      return equivalentValidatorOutput(original, type)
    })

    it('Type notation: \t{ prop: [{ type: Number }] }', () => {
      const plain = createValidator({ prop: [{ type: Number }] })
      return equivalentValidatorOutput(original, plain)
    })

  })

  describe('Nested Property:', () => {

    const original = createValidator({ prop: {} })

    it('Quick notation:    { prop: Object }', () => {
      const quick = createValidator({ prop: Object })
      return equivalentValidatorOutput(original, quick)
    })

    it('Implicit notation: { prop: {} }', () => {
      const imp = createValidator({ prop: {} })
      return equivalentValidatorOutput(original, imp)
    })

  })

  describe('Define Property of any type:', () => {

    const original = createValidator({ prop: null })
    const arrOriginal = createValidator({ prop: [null] })

    it('Type notation: \t\t{ prop: ANY }', () => {
      const quick = createValidator({ prop: types.ANY })
      return equivalentValidatorOutput(original, quick)
    })

    it('Type Array notation: \t{ prop: [ANY] }', () => {
      const type = createValidator({ prop: [types.ANY] })
      return equivalentValidatorOutput(arrOriginal, type)
    })

    it('Quick Array notation: \t{ prop: [] }', () => {
      const type = createValidator({ prop: [] })
      return equivalentValidatorOutput(arrOriginal, type)
    })

  })

  const TYPE_TEST_VALUES = ['foobar', '1337', '587eaa7cb4a64418e292c771', 'Tue Jan 17 2017 15:36:28 GMT-0800 (PST)', '', 0, Infinity, NaN, -Infinity,
    true, new Date(), new Buffer([0x00]), Buffer.from('foobar'),{ foo: true, bar: false}, [], [1], ['rando','string'], new ObjectId(), function(){},
    Symbol(), null, undefined]

  const expectedValidatorResult = (value, type) => {

    if (is(value, Array) && type) // === ANY
      return true

    if (Number.isNaN(value) || is(value, Function) || is(value, Symbol))
      return true

    if (value === undefined || value === null)
      return false

    if (type === Object)
      return !isPlainObject(value)

    return type ? !is(value, type) : false
  }

  types.ALL.forEach(type => {

    const validator = createValidator({ prop: type })

    describe('Type checks ' + (type ? type.name : 'ANY'), () => {

      TYPE_TEST_VALUES.map(value => {

        const expected = expectedValidatorResult(value, type)
        it(stringify(value) + ' should ' + validatorResult(expected), () => testValidator(validator, value, expected))

      })
    })
  })

  types.ALL.forEach(type => {

    describe('Type casts ' + (type ? type.name : 'ANY'), () => {

      const sanitizer = createSanitizer({ prop: type })

      TYPE_TEST_VALUES.map(value => {

        const expected = types.cast(is(value, Array) ? value[0] : value, type)

        it(stringify(value) + ' should cast to ' + stringify(expected), () => testSanitizer(sanitizer, value, expected))
      })
    })
  })
})
