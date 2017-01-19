import { assert  } from 'chai'
import { cast } from '../../lib/types'
import is from 'is-explicit'

import { createSchema, schemaShouldThrow, schemaShouldNotThrow } from './helper'

/* global describe it */


async function runValidator (schema, value, expected) {

  const result = await schema.validate({ prop: value })

  if (is(expected, String)) {
    const explicit = result ? result.prop : result
    return assert.equal(explicit, expected)
  }

  const pass = result ? 'FAIL' : 'PASS'
  const expectedPass = expected ? 'FAIL' : 'PASS'

  return assert.equal(pass, expectedPass)

}

const PASS = false, FAIL = true

describe('Stock General Validators', () => {

  describe('required validator', () => {

    it('fails if input is null or undefined', async () => {

      const schema = createSchema({ type: String, required: true })
      const values = ['whatever', null, 'string', undefined]

      for (const value of values)
        await runValidator(schema, value, !is(value))

    })

    it('optionally takes a predicate function that returns weather value is required.', async () => {
      const schema = createSchema({ type: String, required: () => false })
      await runValidator(schema, null, PASS)
    })

    it('optionally takes a error message string or function', async () => {
      const msg = 'Must have.'
      const schema = createSchema({ type: String, required: [true, msg]})

      await runValidator(schema, null, msg)
    })

  })
})

describe('Stock String Validators', () => {

  describe('required validator', () => {

    it('fails if input is null or undefined', async () => {

      const schema = createSchema({ type: String, required: true })
      const values = ['whatever', null, 'string', undefined]

      for (const value of values)
        await runValidator(schema, value, !is(value))

    })

    it('optionally takes a predicate function that returns weather value is required.', async () => {
      const schema = createSchema({ type: String, required: () => false })
      await runValidator(schema, null, PASS)
    })

    it('optionally takes a error message string or function', async () => {
      const msg = 'Must have.'
      const schema = createSchema({ type: String, required: [true, msg]})

      await runValidator(schema, null, msg)
    })

  })

  describe('enum validator', () => {

    it('expects non-null input to be one of a pre-specified group', async () => {

      const accepted = [1,2,3,4,5]
      const schema = createSchema({ type: Number, enum: { values: accepted } })

      const values = [null, undefined, 1, 2, 3, 10, Infinity]

      for (const value of values) {
        const expected = is(value) ? !accepted.includes(value) : false
        await runValidator(schema, value, expected)
      }

    })

  })
})
