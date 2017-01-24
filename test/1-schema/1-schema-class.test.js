import { expect } from 'chai'
import is from 'is-explicit'

import Schema from '../../lib'

/* global describe it */

const NotPlainObjects = ['string', 129, [], new function(){}, Array, true, null, undefined]
const Definition = {
  description: String
}

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
      .throw('Property already exists.')

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
      .forEach( canSkipValidation =>
        expect(() => new Schema(Definition, { canSkipValidation })).to.not.throw(Error))
  })

  it('Can be composed into other schemas')

})
