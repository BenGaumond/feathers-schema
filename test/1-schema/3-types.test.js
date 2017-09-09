import { assert, expect } from 'chai'
import Schema, { types } from '../../src'
import { ObjectID } from 'mongodb'

/* global describe it */

class Vector2 {
  constructor (x, y) {

    if (!isFinite(x) || !isFinite(y))
      throw new Error('Vector2 requires two numbers!')

    this.x = x
    this.y = y
  }

  get maginitude () {
    return this.x * this.x + this.y * this.y
  }
}

describe('Types', () => {

  describe('types.setCustom()', () => {

    it('allows the addition of custom types', async () => {

      types.resetToDefault()

      expect(() => new Schema({ id: ObjectID })).to.throw('Malformed property: Could not convert to Type notation.')

      types.setCustom(ObjectID)

      const schema = new Schema({ id: ObjectID })
      const data = await schema.sanitize({ id: `${new ObjectID()}` })

      assert(data.id instanceof ObjectID, 'data.id is not an ObjectID')

    })

    it('must be supplied a constructor', () => {
      expect(() => types.setCustom(null, value => value))
        .to.throw('type argument must be a constructor.')
    })

    it('optionally can be supplied a casting function', () => {

      types.resetToDefault()
      expect(() => types.setCustom(ObjectID, value => new ObjectID(`${value}`)))
        .to.not.throw(Error)

      types.resetToDefault()
      expect(() => types.setCustom(ObjectID, 'not a function'))
        .to.throw('caster, if supplied, must be a function')
    })

    it('casting function can be redefined', async () => {
      types.resetToDefault()

      types.setCustom(Vector2)
      const schema = new Schema({ pos: Vector2 })
      let data = await schema.sanitize({ pos: { x: 1, y: 1 } })

      assert(data.pos === null, 'could cast ({ x: 1, y: 1 }) to an Vector2, which it should not be able to do.')

      types.setCustom(Vector2, value => typeof value === 'object'
        ? new Vector2(value.x, value.y)
        : new Vector2(value)
      )

      data = await schema.sanitize({ pos: { x: 1, y: 1 } })
      assert(data.pos instanceof Vector2, 'could not cast ({ x: 1, y: 1 }) to an Vector2, which it should be able to do.')

    })

    it('can supply custom casting functions to default types', async () => {
      types.resetToDefault()
      types.setCustom(String, value => value === 0 ? 'zero' : `${value}`)

      const schema = new Schema({ name: String })

      let data = await schema.sanitize({ name: 0 })
      assert(data.name === 'zero', 'default type casting function didn\'t work!')

      // Reset default type casting method
      types.setCustom(String)

      data = await schema.sanitize({ name: 0 })
      assert(data.name === '0', 'default type casting function could not be reset!')

    })

  })

  describe('types.resetToDefault()', () => {

    it('removes any custom types', () => {

      types.resetToDefault()
      types.setCustom(ObjectID)
      types.setCustom(Vector2)

      types.resetToDefault()

      assert(types.ALL.includes(ObjectID) === false, 'ObjectID not removed')
      assert(types.ALL.includes(Vector2) === false, 'Vector2 not removed')

    })

  })

  describe('types.name()', () => {
    it('returns the name of a type', () => {
      types.resetToDefault()
      assert.equal(types.name(String), 'String', 'Did not name String')
      assert.equal(types.name(Boolean), 'Boolean', 'Did not name Boolean')
      assert.equal(types.name(Date), 'Date', 'Did not name Date')
      assert.equal(types.name(Object), 'Object', 'Did not name Object')
      assert.equal(types.name(Vector2), 'Vector2', 'Did not name Vector2')
      assert.equal(types.name(ObjectID), 'ObjectID', 'Did not name ObjectID')
    })

    it('returns ANY for null or types.ANY', () => {
      assert.equal(types.name(types.ANY), 'ANY', 'Did not name ANY')
      assert.equal(types.name(null), 'ANY', 'Did not name ANY')
    })

    it('returns (Anonymous Type) for constructors without names', () => {
      assert.equal(types.name(function () {}), '(Anonymous Type)', 'Did not name Anonymous')
    })

    it('returns (Invalid Type) for constructors without names', () => {
      assert.equal(types.name(undefined), '(Invalid Type)', 'Did not name Invalid')
      assert.equal(types.name(0), '(Invalid Type)', 'Did not name Invalid')
    })
  })

  describe('types.assert()', () => {

    it('throws if the first type argument is not included in the subsequent type arguments', () => {

      types.resetToDefault()
      expect(() => types.assert(String, Number, Boolean)).to.throw('Expected type: Number,Boolean')

      types.setCustom(Vector2)
      types.setCustom(ObjectID)
      expect(() => types.assert(ObjectID, Vector2, Object)).to.throw('Expected type: Vector2,Object')

    })

    it('does not throw if the first argument is included in the subsequent type arguments', () => {
      types.resetToDefault()
      expect(() => types.assert(String, Number, Boolean, String)).to.not.throw()

      types.setCustom(Vector2)
      types.setCustom(ObjectID)
      expect(() => types.assert(ObjectID, Vector2, ObjectID)).to.not.throw()
    })

    it('does not throw if the subsequent arguments include ANY type', () => {
      types.resetToDefault()
      expect(() => types.assert(String, Number, Boolean, types.ANY)).to.not.throw()

      types.setCustom(Vector2)
      types.setCustom(ObjectID)
      expect(() => types.assert(ObjectID, Vector2, types.ANY)).to.not.throw()
    })

    it('requires at least two arguments', () => {
      expect(() => types.assert(String)).to.throw('types.assert() requires at least type to check and at least one type to check against')
      expect(() => types.assert()).to.throw('types.assert() requires at least type to check and at least one type to check against')
    })

  })

  // There could be a lot more tests for this and the next, but they'd mostly be duplicates of What
  // happens in the definitions.test.js
  describe('types.check()', () => {

    it('returns false if there was no error checking a value against a type requirement', () => {

      const IN_ARRAY = true

      types.resetToDefault()
      types.setCustom(ObjectID)
      assert.equal(types.check(new ObjectID(), ObjectID), false, 'type check incorrect')
      assert.equal(types.check([new ObjectID()], ObjectID, IN_ARRAY), false, 'type check incorrect')
    })

    it('if there is an error, returns it as a string', () => {

      const IN_ARRAY = true

      types.resetToDefault()
      types.setCustom(Vector2)
      assert(typeof types.check(0, Vector2, IN_ARRAY) === 'string', 'type check incorrect')
      assert(typeof types.check([0], Vector2) === 'string', 'type check incorrect')
    })

    it('throws if checked against an invalid type', () => {
      types.resetToDefault()
      expect(() => types.check('beam', ObjectID)).to.throw('invalid type argument.')
    })
  })

  // There could be a lot more tests for this and the next, but they'd mostly be duplicates of What
  // happens in the definitions.test.js
  describe('types.cast()', () => {

    it('casts a value to a desired type', () => {

      types.resetToDefault()
      types.setCustom(ObjectID)
      types.setCustom(Vector2, obj => new Vector2(obj.x, obj.y))

      const objid = new ObjectID()
      assert(types.cast(`${objid}`, ObjectID).toString() === `${objid}`, `${objid} to ObjectID !== ${objid}`)
      assert.deepEqual(types.cast({x: 0, y: 1}, Vector2), {x: 0, y: 1}, `{x:0, y:1} to Vector2 !== Vector2(0,1)`)

    })

    it('optionally ensure value is in an array', () => {

      types.resetToDefault()
      types.setCustom(ObjectID)

      const str = `${new ObjectID()}`
      const AS_ARRAY = true

      const arr = types.cast(str, ObjectID, AS_ARRAY)

      assert(arr instanceof Array, 'could not cast to array')
    })

    it('returns null if cast could not complete', () => {

      types.resetToDefault()
      types.setCustom(ObjectID)
      types.setCustom(Vector2)

      assert.equal(types.cast('string', ObjectID), null, `'string' could convert to ObjectID`)
      assert.equal(types.cast('string', Vector2), null, `'string' could convert to Vector2`)

    })

    it('optionally ensures value is not in an array', () => {
      types.resetToDefault()
      types.setCustom(ObjectID)

      const str = `${new ObjectID()}`

      let id = types.cast([str], ObjectID)

      assert(id instanceof ObjectID, 'type cast failed')

      id = types.cast([str, new ObjectID()], ObjectID)
      assert(id instanceof ObjectID, 'type cast failed')

    })

  })

})
