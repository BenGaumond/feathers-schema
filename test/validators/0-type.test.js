import Schema from '../../lib'
import { assert, expect } from 'chai'
/* global describe it */

// describe.skip('Type Validator', () => {
//
//   describe.skip('Equivalent ways to define a string description property:', () => {
//
//     const validator = obj => new Schema(obj).validators.description[0]
//     const original = validator({ description: String })
//     const VALUES = ['string', null, undefined, 10, {}]
//
//     it('Quick notation: \t{ description: String }', () => {
//       const quick = validator({ description: String })
//       VALUES.forEach(value => assert.equal(original(value), quick(value)))
//     })
//
//     it('Plain notation: \t{ description: { type: String } }', () => {
//       const plain = validator({ description: { type: String } })
//       VALUES.forEach(value => assert.equal(original(value), plain(value)))
//     })
//
//     it('Array notation: \t{ description: { type: [String, false, null] } } }', () => {
//
//     })
//
//     it('Explicit notation: \t{ description: { type: { type: String, asArray: false, msg: null } } }', () => {
//
//     })
//
//   })
//
// })
