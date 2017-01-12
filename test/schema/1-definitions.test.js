import Schema, { validators } from '../../lib'
import { assert  } from 'chai'
/* global describe it */

// const shouldThrow = obj => expect(() => new Schema(obj)).to.throw(Error)
// const shouldNotThrow = obj => expect(() => new Schema(obj)).to.not.throw(Error)

function createValidator(obj) {
  return new Schema(obj).validators.prop[0]
}

function compareValidatorOutput(v1, v2) {

  ['string', null, undefined, 10, {}, [], ['string'], [100], true, [false], Symbol(), [Symbol()], Infinity, NaN]
    .forEach(value => assert.equal(v1(value), v2(value)))
}

describe('Schema Property Definitions', () => {

  describe('Equivalent ways to define a value property:', () => {

    const original = createValidator({ prop: Number })

    it('Type notation: \t\t{ prop: Number }', () => {
      const type = createValidator({ prop: Number })
      compareValidatorOutput(original, type)
    })

    it('Quick notation: \t{ prop: { type: Number } }', () => {
      const plain = createValidator({ prop: { type: Number } })
      compareValidatorOutput(original, plain)
    })

    it('Array notation: \t{ prop: { type: [Number] } } }', () => {
      const implicit = createValidator({ prop: { type: [Number] } })
      compareValidatorOutput(original, implicit)
    })

    it('Object notation: \t{ prop: { type: { func: Number } } }', () => {
      const explicit = createValidator({ prop: { type: { func: Number } }})
      compareValidatorOutput(original, explicit)
    })

    it('Custom field args: \t{ prop: { validates: validators.type(Number) } }', () => {
      const customArgs = createValidator({ prop: { validates: validators.type(Number) } })
      compareValidatorOutput(original, customArgs)
    })
    it('Custom field Array: \t{ prop: { validates: validators.type([Number]) } }', () => {
      const customArr = createValidator({ prop: { validates: validators.type([Number]) } })
      compareValidatorOutput(original, customArr)
    })
    it('Custom field Object: \t{ prop: { validates: validators.type({ func: Number }) } }', () => {
      const customField = createValidator({ prop: { validates: validators.type({ func: Number }) } })
      compareValidatorOutput(original, customField)
    })

  })

  describe('Equivalent ways to define an array property:', () => {

    const original = createValidator({ prop: [Number] })

    it('Type notation: \t\t{ prop: [Number] }', () => {
      const type = createValidator({ prop: [Number] })
      compareValidatorOutput(original, type)
    })

    it('Quick notation: \t{ prop: [{ type: Number }] }', () => {
      const plain = createValidator({ prop: [{ type: Number }] })
      compareValidatorOutput(original, plain)
    })

    it('Array notation: \t{ prop: { type: [Number, true] } } }', () => {
      const implicit = createValidator({ prop: { type: [Number, true] } })
      compareValidatorOutput(original, implicit)
    })

    it('Object notation: \t{ prop: { type: { func: Number, arrayOf: true } } }', () => {
      const explicit = createValidator({ prop: { type: { func: Number, arrayOf: true } } })
      compareValidatorOutput(original, explicit)
    })

    it('Custom field args: \t{ prop: { validates: validators.type(Number, true) } }', () => {
      const customArgs = createValidator({ prop: { validates: validators.type(Number, true) } })
      compareValidatorOutput(original, customArgs)
    })

    it('Custom field Array: \t{ prop: { validates: validators.type([Number, true]) } }', () => {
      const customArr = createValidator({ prop: { validates: validators.type([Number, true]) } })
      compareValidatorOutput(original, customArr)
    })

    it('Custom field Object: \t{ prop: { validates: validators.type({ func: Number, arrayOf: true }) } }', () => {
      const customField = createValidator({ prop: { validates: validators.type({ func: Number, arrayOf: true }) } })
      compareValidatorOutput(original, customField)
    })

  })

  describe('Equivalent ways to define a nested property:', () => {

    it('Type notation: \t\t{ prop: Object }')
    it('Quick notation: \t{ prop: { } }', () => {

      const schema = new Schema({
        prop: {
          case: {

          }
        }
      })

      console.log(schema)

      //console.log(schema.paths)

    })

  })

})
