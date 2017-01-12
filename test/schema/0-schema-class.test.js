import { expect } from 'chai'
import is from 'is-explicit'

import Schema from '../../lib'
import clear from 'cli-clear'

/* global describe it */

const NotPlainObjects = ['string', 129, [], new function(){}, Array, true, null, undefined]

clear()
describe('Schema Class', () => {

  it('Takes a plain object representing definitions as its first argument.', () => {

    expect(() => new Schema({})).to.not.throw(Error)

    NotPlainObjects.forEach(invalid => expect(() => new Schema(invalid)).to.throw(Error))

  })

  it('Optionally takes a plain object representing options as its second argument', () => {

    expect(() => new Schema({}, {})).to.not.throw(Error)

    NotPlainObjects
      .filter(invalid => is(invalid))
      .forEach(invalid => expect(() => new Schema({}, invalid)).to.throw(Error))

  })

  it('options.canSkipValidation must be a boolean or function', () => {

    expect(() => new Schema({}, { canSkipValidation: 'sure' })).to.throw(Error);

    [() => false, true, false]
      .forEach( canSkipValidation =>
        expect(() => new Schema({}, { canSkipValidation })).to.not.throw(Error))
  })

  it('Is frozen after instantiation.', () => {

    expect(() => {

      const schema = new Schema({})

      schema.paths.push('value')
      delete schema.validators

    }).to.throw(Error)
  })

})
