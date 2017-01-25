import { assert  } from 'chai'
import { ALL } from '../../lib/types'
import is from 'is-explicit'

import { createSchema, schemaShouldThrow, schemaShouldNotThrow } from './helper'

/* global describe it */

async function runValidator (schema, value, expected) {

  const result = await schema.validate({ prop: value })

  if (is(expected, String, Object)) {
    const explicit = result ? result.prop : result
    return assert.deepEqual(explicit, expected)
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
      const schema = createSchema({ type: String, required: msg })

      await runValidator(schema, null, msg)
    })

    it('handles array', () => {

      const schema = createSchema([{ type: String, required: true }])
      const arrs = [['OY'], ['yes'], ['no'], null]

      return Promise.all(arrs.map(async arr => {

        return await runValidator(schema, arr, !arr)

      }))
    })

    it('zero length arrays fail', async () => {

      const schema = createSchema([{ type: String, required: true }])

      await runValidator(schema, [], 'Required.')

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

    it('handles arrays', async () => {
      const msg = 'FAIL'
      const schema = createSchema([{ type: Number, enum: [acceptedNums, msg]}])
      await runValidator(schema, [1,2,3,4,5], PASS)
      await runValidator(schema, [1,2,3,4,0], [PASS, PASS, PASS, PASS, msg])

    })
  })
})

describe('Stock String Validators', () => {

  describe('length validator', () => {

    it('fails if string length doesn\'t comply with specified parameters.', async () => {

      const tests = [[10, '<='], ['>=', 6], [4,8], [0, '>'], ['>=', 10]]
      const expects = [n => n <= 10, n => n >= 6, n => n >= 4 && n <= 8, n => n > 0, n => n >= 10 ]
      const values = Array.from({length: 11}, (u,i) => '*'.repeat(i))

      for (let i = 0; i < tests.length; i++) {
        const test = tests[i]
        const schema = createSchema({ type: String, length: test })

        const expect = expects[i]

        for (const value of values)
          await runValidator(schema, value, !expect(value.length))
      }

    })

    it('requires a min and max value, or a value and a comparer', async () => {

      schemaShouldThrow({ type: String, length: [0,'<=>'] }, 'For comparing a range, a min and max value is required.')
      schemaShouldThrow({ type: String, length: {max: 100} }, 'For comparing a range, a min and max value is required.')
      schemaShouldThrow({ type: String, length: {value: 100} }, 'Cannot just provide a value to compare a range.')
      schemaShouldThrow({ type: String, length: [0] }, 'For comparing a range, a min and max value is required.')
      schemaShouldNotThrow({ type: String, length: {min: 10, max: 100} })
      schemaShouldNotThrow({ type: String, length: {value: 10, compare: '<='} })
      schemaShouldNotThrow({ type: String, length: ['<', 10] })
      schemaShouldNotThrow({ type: String, length: ['>', 50] })
      schemaShouldNotThrow({ type: String, length: [10,100] })

    })

    it('requires a String property', () => {
      for (const type of ALL)
        if (type === String)
          schemaShouldNotThrow({ type, length: [0,10] })
        else
          schemaShouldThrow({ type, length: [0,10] }, 'Expected type: String')
    })


    it('optionally takes a error message string', async () => {
      const msg = '8 or less characters, please.'
      const schema = createSchema({ type: String, length: { value: 8, compare: '<=', msg } })

      await runValidator(schema, 'tattoos-are-rad', msg)
    })

    it('passes if input is null or undefined', async () => {
      const schema = createSchema({ type: String, length: { min: 2, max: 4, compare: '<=>' } })
      await runValidator(schema, null, false)
    })

    it('handles arrays', async () => {

      const schema = createSchema([{ type: String, length:[0,5, '<=>', 'Bad.'] }])

      const arr = Array.from({length: 10}, (u,i) => '*'.repeat(i))

      return await runValidator(schema, arr, arr.map(str => str.length <= 5 ? false : 'Bad.'))
    })

  })

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

    it('handles arrays', async () => {
      const values = ['895-1029', '019-1298', 'no phone', 'technology is for suckers', '891-1092s']
      const schema = createSchema([{ type: String, format: [phoneRegex, 'Bad.'] }])

      await runValidator(schema, values, values.map( v => phoneRegex.test(v) ? false : 'Bad.'))
    })

  })

  describe('email validator', () => {
    const values = ['jerry@email.com', 'steve+watson@google.com', 'clancy', 'carol@www', 'reddit.com']
    const results = [PASS, PASS, FAIL, FAIL, FAIL]

    it('fails if value isn\'t formatted as an email', async () => {

      const schema = createSchema({ type: String, email: true })

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

    it('handles arrays', async () => {
      const schema = createSchema([{ type: String, email: 'Bad.' }])

      await runValidator(schema, values, results.map(result => result === PASS ? PASS : 'Bad.'))
    })
  })

  describe('alphanumeric validator', () => {

    const values = ['1293khjf', 'aceOfBase123', ':)', 'lol what', '<html/>']
    const results = [PASS, PASS, FAIL, FAIL, FAIL]

    it('fails if value isn\'t alphanumeric', async () => {

      const schema = createSchema({ type: String, alphanumeric: true })


      for (let i = 0; i < values.length; i++) {
        const expected = results[i]
        const value = values[i]
        await runValidator(schema, value, expected)
      }

    })

    it('optionally takes a error message string', async () => {
      const msg = 'If you put anything but letters or numbers I will straight up cut you.'
      const schema = createSchema({ type: String, alphanumeric: msg })

      await runValidator(schema, 'I <3 you!!!', msg)
    })

    it('passes if input is null or undefined', async () => {
      const schema = createSchema({ type: String, alphanumeric: true })
      await runValidator(schema, null, false)
    })

    it('requires a String property', async () => {
      for (const type of ALL)
        if (type === String)
          await schemaShouldNotThrow({ type, alphanumeric: true })
        else
          await schemaShouldThrow({ type, alphanumeric: true }, 'Expected type: String')
    })

    it('handles arrays', async () => {
      const schema = createSchema([{ type: String, alphanumeric: 'Bad.' }])

      await runValidator(schema, values, results.map(result => result === PASS ? PASS : 'Bad.'))
    })
  })

  describe('nospaces validator', () => {
    const values = ['snake_case', 'one-two-three', '"  "', 'lol what', '01 10 01 10']
    const results = [PASS, PASS, FAIL, FAIL, FAIL]

    it('fails if value has spaces', async () => {

      const schema = createSchema({ type: String, nospaces: true })

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

    it('handles arrays', async () => {
      const schema = createSchema([{ type: String, nospaces: 'Bad.' }])

      await runValidator(schema, values, results.map(result => result === PASS ? PASS : 'Bad.'))
    })

  })

})

describe('Stock Number Validators', () => {

  describe('range validator', () => {



    it('fails if value doesn\'t comply with specified parameters.', async () => {

      const tests = [[10, '<='], ['>=', 6], [4,8], [0, '>'], ['>=', 10]]
      const expects = [n => n <= 10, n => n >= 6, n => n >= 4 && n <= 8, n => n > 0, n => n >= 10 ]
      const values = Array.from({length: 11}, (u,i) => i)

      for (let i = 0; i < tests.length; i++) {

        const test = tests[i]
        const schema = createSchema({ type: Number, range: test })

        const expect = expects[i]

        for (const value of values)
          await runValidator(schema, value, !expect(value))

      }
    })

    it('requires a min and max value, or a value and a comparer', () => {

      schemaShouldThrow({ type: Number, range: [0,'<=>'] }, 'For comparing a range, a min and max value is required.')
      schemaShouldThrow({ type: Number, range: {max: 100} }, 'For comparing a range, a min and max value is required.')
      schemaShouldThrow({ type: Number, range: {value: 100} }, 'Cannot just provide a value to compare a range.')
      schemaShouldThrow({ type: Number, range: [0] }, 'For comparing a range, a min and max value is required.')
      schemaShouldNotThrow({ type: Number, range: {min: 10, max: 100} })
      schemaShouldNotThrow({ type: Number, range: {value: 10, compare: '<='} })
      schemaShouldNotThrow({ type: Number, range: ['<', 10] })
      schemaShouldNotThrow({ type: Number, range: ['>', 50] })
      schemaShouldNotThrow({ type: Number, range: [10,100] })

    })

    it('requires a Number property', () => {
      for (const type of ALL)
        if (type === Number)
          schemaShouldNotThrow({ type, range: [0,10] })
        else
          schemaShouldThrow({ type, range: [0,10] }, 'Expected type: Number')
    })


    it('optionally takes a error message string', async () => {
      const msg = '8 or less.'
      const schema = createSchema({ type: Number, range: { value: 8, compare: '<=', msg } })

      await runValidator(schema, 9, msg)
    })

    it('passes if input is null or undefined', async () => {
      const schema = createSchema({ type: Number, range: { min: 2, max: 4, compare: '<=>' } })

      await runValidator(schema, null, false)
    })

    it('handles arrays', async () => {
      const values = [1,2,3,4,5,6,7,8,9,10]
      const schema = createSchema([{ type: Number, range: [0, 4, '<=>', 'Bad.'] }])

      await runValidator(schema, values, values.map(value => value <= 4 ? PASS : 'Bad.'))
    })

  })

  describe('even validator', () => {

    it('throws an error if value is even', async () => {

      const schema = createSchema({ type: Number, even: true})
      const values = [1,4,7,8,10,11,129,12371,123,101209]

      for (const value of values) {
        const expected = !(value % 2 === 0)
        await runValidator(schema, value, expected)
      }

    })

    it('requires a Number property', () => {
      for (const type of ALL)
        if (type === Number)
          schemaShouldNotThrow({ type, even: true })
        else
          schemaShouldThrow({ type, even: true }, 'Expected type: Number')
    })

    it('passes if input is null or undefined', async () => {
      const schema = createSchema({ type: Number, even: true })

      await runValidator(schema, null, false)
    })

    it('optionally takes a error message string', async () => {
      const msg = 'Make it an even number, you unfair fuck.'
      const schema = createSchema({ type: Number, even: msg })

      await runValidator(schema, 9, msg)
    })

    it('handles arrays', async () => {
      const values = [1,2,3,4,5,6,7,8,9,10]
      const schema = createSchema([{ type: Number, even: 'Bad.' }])

      await runValidator(schema, values, values.map(value => value % 2 === 0 ? PASS : 'Bad.'))
    })

  })

  describe('odd validator', () => {

    it('throws an error if value is odd', async () => {

      const schema = createSchema({ type: Number, odd: true})
      const values = [1,4,7,8,10,11,129,12371,123,101209]

      for (const value of values) {
        const expected = !(value % 2 === 1)
        await runValidator(schema, value, expected)
      }

    })

    it('requires a Number property', () => {
      for (const type of ALL)
        if (type === Number)
          schemaShouldNotThrow({ type, odd: true })
        else
          schemaShouldThrow({ type, odd: true }, 'Expected type: Number')
    })

    it('passes if input is null or undefined', async () => {
      const schema = createSchema({ type: Number, odd: true })

      await runValidator(schema, null, false)
    })

    it('optionally takes a error message string', async () => {
      const msg = 'Make it an odd number, you soccer mom.'
      const schema = createSchema({ type: Number, odd: msg })

      await runValidator(schema, 10, msg)
    })

    it('handles arrays', async () => {
      const values = [1,2,3,4,5,6,7,8,9,10]
      const schema = createSchema([{ type: Number, odd: 'Bad.' }])

      await runValidator(schema, values, values.map(value => value % 2 === 1 ? PASS : 'Bad.'))
    })


  })

})
