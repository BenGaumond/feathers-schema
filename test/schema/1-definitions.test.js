import Schema, { types } from '../../lib'
import { assert  } from 'chai'
import is from 'is-explicit'
import ObjectId from 'bson-objectid'
/* global describe it */

// const shouldThrow = obj => expect(() => new Schema(obj)).to.throw(Error)
// const shouldNotThrow = obj => expect(() => new Schema(obj)).to.not.throw(Error)

function createValidator(obj, key = 'prop') {
  const schema = new Schema(obj)
  const property = schema.properties[key]

  const validator = property.validate.bind(property)
  validator.type = property.type

  return validator
}

const stringify = val => is(val, Symbol) ? 'Symbol' :
  is(val, Buffer) ? 'Buffer' :
  val === '' ? 'empty string' :
  is(val, Array) ? 'Array' :
  is(val, String) ? '"'+val+'"' :
  val

const result = val => val ? 'FAIL' : 'PASS'

async function testValidator(validator, value, expected) {

  const passOrFail = await validator(value)

  assert.equal(result(passOrFail), result(expected))
}

async function equivalentValidatorOutput(v1, v2) {

  return Promise.all(['string', null, undefined, 10, {}, [{}], [], ['string'], [100], true, [false], Symbol(), [Symbol()], Infinity, NaN]
    .map(async value => {
      const r1 = await v1(value)
      const r2 = await v2(value)

      assert.equal(v1.type, v2.type)

      return assert.deepEqual(r1,r2)
    }))

}

describe('Schema Property Definitions', () => {

  describe('Property of a given Type:', () => {

    const original = createValidator({ prop: Number })

    it('Quick notation: { prop: Number }', () => {
      const type = createValidator({ prop: Number })

      return equivalentValidatorOutput(original, type)
    })

    it('Type notation: \t{ prop: { type: Number } }', () => {
      const plain = createValidator({ prop: { type: Number } })
      return equivalentValidatorOutput(original, plain)
    })

  })

  describe('Property of an array of a given Type:', () => {

    const original = createValidator({ prop: [Number] })

    it('Quick notation: { prop: [Number] }', () => {
      const type = createValidator({ prop: [Number] })
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

  const TYPE_TEST_VALUES = ['foobar', '', 0, 1, Infinity, -Infinity, NaN,
    true, false, new Date(), new Buffer([0x00]), {}, [], new ObjectId(), function(){},
    Symbol(), null, undefined]

  const TYPES = types.ALL.filter(type => type != types.ANY)
  TYPES.forEach(type => {

    describe('Type Checks ' + type.name, () => {

      TYPE_TEST_VALUES.map(value => {

        const expected = !((value == null || is(value, type)) && !is(value, Function) && !is(value, Symbol) && !is(value, Array))

        it(stringify(value) + ' should ' + result(expected), () => {

          const validator = createValidator({ prop: type })
          return testValidator(validator, value, expected)

        })
      })

    })

  })

  describe('Type checks ANY', () => {

    TYPE_TEST_VALUES.map(value => {

      const expected = !(value == null || !Number.isNaN(value) && !is(value, Function) && !is(value, Symbol))

      it(stringify(value) + ' should ' + result(expected), () => {

        const validator = createValidator({ prop: types.ANY })
        return testValidator(validator, value, expected)
      })
    })
  })
})
