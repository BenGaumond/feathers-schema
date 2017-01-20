import { assert  } from 'chai'
import { ALL } from '../../lib/types'
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

    it('optionally takes a error message string', async () => {
      const msg = 'Must have.'
      const schema = createSchema({ type: String, required: msg})

      await runValidator(schema, null, msg)
    })

  })

  describe('enum validator', () => {

    const acceptedNums = [1,2,3,4,5]
    const acceptedStrs = ['one', 'two', 'three']

    it('fails if input isn\'t included in an enumeration', async () => {

      const schema = createSchema({ type: Number, enum: acceptedNums })
      const values = [null, undefined, 1, 2, 3, 10, Infinity]

      for (const value of values) {
        const expected = is(value) ? !acceptedNums.includes(value) : PASS
        await runValidator(schema, value, expected)
      }

    })

    it('passes if input is null or undefined', async () => {
      const schema = createSchema({ type: Number, enum: acceptedNums })
      await runValidator(schema, null, false)
    })

    it('requires a String or Number property', async () => {
      for (const type of ALL)
        if (type === String || type === Number)
          await schemaShouldNotThrow({ type, enum: type === Number ? acceptedNums : acceptedStrs })
        else
          await schemaShouldThrow({ type, enum: true }, 'Expected type: String,Number')
    })

    it('requires an array of values', async () => {
      await schemaShouldThrow({ type: Number, enum: true }, 'enum requires an array of Number values.')
      await schemaShouldThrow({ type: String, enum: true }, 'enum requires an array of String values.')
      await schemaShouldThrow({ type: String, enum: acceptedNums }, 'enum requires an array of String values.')
      await schemaShouldThrow({ type: Number, enum: acceptedStrs }, 'enum requires an array of Number values.')
      await schemaShouldNotThrow({ type: Number, enum: acceptedNums })
      await schemaShouldNotThrow({ type: String, enum: acceptedStrs })
    })

    it('optionally takes a error message string', async () => {
      const msg = `Only ${acceptedNums} will do.`
      const schema = createSchema({ type: Number, enum: [acceptedNums, msg] })

      await runValidator(schema, 0, msg)
    })
  })
})

describe('Stock String Validators', () => {

  const phoneRegex = /^\d\d\d-\d\d\d\d$/
  describe('format validator', () => {

    it('fails if value doesn\'t pass regex test', async () => {

      const schema = createSchema({ type: String, format: phoneRegex })
      const values = ['895-1029', '019-1298', 'i dont wanna give my phone number', 'i forgot my phone number', null]

      for (const value of values) {
        const expected = is(value) ? !phoneRegex.test(value) : PASS
        await runValidator(schema, value, expected)
      }

    })

    it('optionally takes a error message string', async () => {
      const msg = 'Must be a phone number.'
      const schema = createSchema({ type: String, format: [phoneRegex, msg] })

      await runValidator(schema, 'potato', msg)
    })

    it('passes if input is null or undefined', async () => {
      const schema = createSchema({ type: String, format: phoneRegex })
      await runValidator(schema, null, false)
    })

    it('requires a String property', async () => {
      for (const type of ALL)
        if (type === String)
          await schemaShouldNotThrow({ type, format: phoneRegex })
        else
          await schemaShouldThrow({ type, format: phoneRegex }, 'Expected type: String')
    })

  })

  describe('email validator', () => {

    it('fails if value isn\'t formatted as an email', async () => {

      const schema = createSchema({ type: String, email: true })
      const values = ['jerry@email.com', 'steve+watson@google.com', 'clancy', 'carol@www', 'reddit.com']
      const results = [PASS, PASS, FAIL, FAIL, FAIL]

      for (let i = 0; i < values.length; i++) {
        const expected = results[i]
        const value = values[i]
        await runValidator(schema, value, expected)
      }

    })

    it('passes if input is null or undefined', async () => {
      const schema = createSchema({ type: String, email: true })
      await runValidator(schema, null, false)
    })

    it('optionally takes a error message string', async () => {
      const msg = 'Enter an email only.'
      const schema = createSchema({ type: String, email: msg })

      await runValidator(schema, 'potato', msg)
    })

    it('requires a String property', async () => {
      for (const type of ALL)
        if (type === String)
          await schemaShouldNotThrow({ type, email: true })
        else
          await schemaShouldThrow({ type, email: true }, 'Expected type: String')
    })
  })

  describe('alphanumeric validator', () => {

    it('fails if value isn\'t alphanumeric', async () => {

      const schema = createSchema({ type: String, alphanumeric: true })
      const values = ['1293khjf', 'aceOfBase123', ':)', 'lol what', '<html/>']
      const results = [PASS, PASS, FAIL, FAIL, FAIL]

      for (let i = 0; i < values.length; i++) {
        const expected = results[i]
        const value = values[i]
        await runValidator(schema, value, expected)
      }

    })

    it('passes if input is null or undefined', async () => {
      const schema = createSchema({ type: String, alphanumeric: true })
      await runValidator(schema, null, false)
    })

    it('optionally takes a error message string', async () => {
      const msg = 'If you put anything but letters or numbers I will straight up cut you.'
      const schema = createSchema({ type: String, alphanumeric: msg })

      await runValidator(schema, 'I <3 you!!!', msg)
    })

    it('requires a String property', async () => {
      for (const type of ALL)
        if (type === String)
          await schemaShouldNotThrow({ type, alphanumeric: true })
        else
          await schemaShouldThrow({ type, alphanumeric: true }, 'Expected type: String')
    })
  })

  describe('nospaces validator', () => {

    it('fails if value isn\'t nospaces', async () => {

      const schema = createSchema({ type: String, nospaces: true })
      const values = ['snake_case', 'one-two-three', '"  "', 'lol what', '01 10 01 10']
      const results = [PASS, PASS, FAIL, FAIL, FAIL]

      for (let i = 0; i < values.length; i++) {
        const expected = results[i]
        const value = values[i]
        await runValidator(schema, value, expected)
      }

    })

    it('passes if input is null or undefined', async () => {
      const schema = createSchema({ type: String, nospaces: true })
      await runValidator(schema, null, false)
    })

    it('optionally takes a error message string', async () => {
      const msg = 'No spaces allowed, you wanna be hacker.'
      const schema = createSchema({ type: String, nospaces: msg })

      await runValidator(schema, 'I <3 you!!!', msg)
    })

    it('requires a String property', async () => {
      for (const type of ALL)
        if (type === String)
          await schemaShouldNotThrow({ type, nospaces: true })
        else
          await schemaShouldThrow({ type, nospaces: true }, 'Expected type: String')
    })
  })

})
