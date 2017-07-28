import { expect, assert } from 'chai'
import is from 'is-explicit'

import Schema from '../../src'

/* global describe it */

function compareProperties (a, b) {

  assert.deepEqual(Object.keys(a), Object.keys(b), 'Property keys do not match.')

  for (const property of a) {

    const { key } = property

    const ap = a[key]
    const bp = b[key]

    assert.equal(ap.type, bp.type)
    assert.equal(ap.array, bp.array)

    assert.equal(ap.validators.length, bp.validators.length)
    for (let i = 0; i < ap.validators.length; i++)
      assert.equal(ap.validators[i].toString(), bp.validators[i].toString())

    assert.equal(ap.sanitizers.length, bp.sanitizers.length)
    for (let i = 0; i < ap.sanitizers.length; i++)
      assert.equal(ap.sanitizers[i].toString(), bp.sanitizers[i].toString())

    assert.equal(!!ap.properties, !!bp.properties)

    if (ap.properties)
      compareProperties(ap.properties, bp.properties)

  }

}

const NotPlainObjects = ['string', 129, [], new function () {}(), Array, true, null, undefined]
const Definition = { description: String }

describe('Schema Class', () => {

  it('Takes a plain object representing definitions as its first argument.', () => {

    expect(() => new Schema(Definition)).to.not.throw(Error)

    NotPlainObjects.forEach(invalid => expect(() => new Schema(invalid)).to.throw(Error))

  })

  it('Requires at least one property in the definitions object.', () => {

    expect(() => new Schema({})).to.throw('Schema was created with no properties.')

  })

  it('Cannot add properties that already exist.', () => {

    const schema = new Schema(Definition)

    expect(() => schema.addProperty(Definition, 'description'))
      .to
      .throw('Property already exists: description')

  })

  it('Optionally takes a plain object representing options as its second argument.', () => {

    expect(() => new Schema(Definition, {})).to.not.throw(Error)

    NotPlainObjects
      .filter(invalid => is(invalid))
      .forEach(invalid => expect(() => new Schema({}, invalid)).to.throw(Error))

  })

  it('Option canSkipValidation must be a boolean or function', () => {

    expect(() => new Schema(Definition, { canSkipValidation: 'sure' })).to
      .throw('Schema options.canSkipValidation is expected to be a boolean or a predicate function.');

    [() => false, true, false]
      .forEach(canSkipValidation =>
        expect(() => new Schema(Definition, { canSkipValidation })).to.not.throw(Error))
  })

  it('Can be composed into other schemas', () => {

    const authorSchema = new Schema({
      name: {
        first: { type: String, required: true, length: ['<=', 24] },
        last: { type: String, required: true, length: ['<=', 24] }
      },
      age: { type: Number, range: ['>', 16, 'Must be over 16 years old.'] }
    })

    const commentSchema = new Schema({
      body: String,
      author: authorSchema,
      timestamp: Date
    })

    const articleSchema = new Schema({
      writeup: { type: String, required: true },
      author: authorSchema,
      comments: [commentSchema]
    })

    const uncomposedArticleSchema = new Schema({
      writeup: { type: String, required: true },

      author: {
        name: {
          first: { type: String, required: true, length: ['<=', 24] },
          last: { type: String, required: true, length: ['<=', 24] }
        },
        age: { type: Number, range: ['>', 16, 'Must be over 16 years old.'] }
      },

      comments: [{
        body: String,
        author: {
          name: {
            first: { type: String, required: true, length: ['<=', 24] },
            last: { type: String, required: true, length: ['<=', 24] }
          },
          age: { type: Number, range: ['>', 16, 'Must be over 16 years old.'] }
        },
        timestamp: Date
      }]

    })

    compareProperties(articleSchema.properties, uncomposedArticleSchema.properties)

  })

})
