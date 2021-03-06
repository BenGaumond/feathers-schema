import App from '../app'
import memory from 'feathers-memory'
import { assert, expect } from 'chai'

/* global describe it before after */

import Schema from '../../src'

const unique = true, required = true, nospaces = true // eslint-disable-line

const person = new Schema({

  name: {
    first: { type: String, nospaces, required },
    last: { type: String, nospaces, required },
    alias: { type: String, nospaces, unique }
  },

  email: { type: String, unique },

  gender: { type: String, enum: ['male', 'female'], required },

  age: { type: Number, range: [ '>=', 0, 'Must be born.' ] },

  SIN: { type: Number, required, unique: 'IMPOSTER!', range: [1000, 9999] }

})

describe('Stock Server Validations', () => {

  describe('unique validator', () => {

    let service, app

    before(async () => {

      app = new App()
      app.use('/people', memory())

      service = app.service('people')
      service.before({
        create: [...person.hooks],
        patch: [...person.hooks],
        update: [...person.hooks]
      })

      await app.start()

      // seed
      await service.create([
        {
          name: { first: 'John', last: 'Gravy', alias: 'Gravytrain' },
          gender: 'male',
          age: 40,
          SIN: 8720
        }, {
          name: { first: 'Aaron', last: 'Shall' },
          gender: 'male',
          age: 20,
          SIN: 2152
        }, {
          name: { first: 'Sharon', last: 'Rulen' },
          gender: 'female',
          age: 22,
          SIN: 2412
        }, {
          name: { first: 'Alice', last: 'Rulen' },
          gender: 'female',
          age: 24,
          SIN: 6457
        }, {
          name: { first: 'Chris', last: 'Brodie', alias: 'WuTang' },
          gender: 'male',
          age: 31,
          SIN: 3451
        }, {
          name: { first: 'Beatrix', last: 'Ferrul', alias: 'Bonny-Guns' },
          gender: 'male',
          age: 43,
          SIN: 8917
        }
      ])

    })

    it('Cannot be placed in array properties, or descendents thereof', () => {

      const error = 'Currently, unique validators can\'t be placed on array properties, or descendants of array properties.'
      expect(() => new Schema({
        comments: [{ name: { type: String, unique } }]
      })).to.throw(error)

      expect(() => new Schema({
        authors: [{
          books: [String],
          info: {
            name: {
              type: String, unique
            }
          }
        }]
      })).to.throw(error)

    })

    it('Ensures property has a unique value.', async () => {

      const kirk = await service.create({
        name: { first: 'James', last: 'Kirk', alias: 'Capn' },
        email: 'james@enterprise.com',
        gender: 'male',
        age: 32,
        SIN: 7126
      })

      await service.create({
        name: { first: 'Scotty', last: 'McWhatever' },
        email: 'scotty@enterprise.com',
        gender: 'male',
        age: 45,
        SIN: 7128
      })

      let err
      try {
        await service.patch(kirk.id, {
          email: 'scotty@enterprise.com'
        })
      } catch (e) {
        err = e.errors
      }

      assert.deepEqual(err, { email: 'Must be unique.' })

    })

    it('Ensures nested property has a unique value.', async () => {

      let err

      try {

        await service.create({
          name: { first: 'Bonyun', last: 'Lui', alias: 'Bonny-Guns' },
          gender: 'female',
          age: 19,
          SIN: 5001
        })

      } catch (e) {

        err = e.errors
      }

      assert(err && err.name, 'No error returned by query.')
      assert.equal(err.name.alias, 'Must be unique.')

    })

    it('Optionally takes a custom error message.', async () => {
      let err

      try {

        await service.create({
          name: { first: 'Richard', last: 'Bonnel' },
          gender: 'male',
          age: 30,
          SIN: 2412
        })

      } catch (e) {

        err = e.errors
      }

      assert(err, 'No error returned by query.')
      assert.equal(err.SIN, 'IMPOSTER!')
    })

    after(async () => app.end())

  })

  it('works on services with pagination configured', async () => {

    const app = new App()
    app.use('/users', memory({
      paginate: {
        default: 5,
        max: 100
      }
    }))

    const users = app.service('users')

    const { hooks } = new Schema({
      email: { type: String, required: true, email: true, unique: true }
    })

    users.before({
      create: [ ...hooks ],
      patch: [ ...hooks ],
      update: [ ...hooks ]
    })

    await users.create([
      { email: 'jerry.smith@gmail.com' },
      { email: 'john.smith@gmail.com' },
      { email: 'jane.smith@gmail.com' },
      { email: 'jake.smith@gmail.com' },
      { email: 'gerry.smith@gmail.com' }
    ])

    let errors

    try {
      await users.create({ email: 'jerry.smith@gmail.com' })
    } catch (err) {
      errors = err.errors
    }

    assert.deepEqual(errors, { email: 'Must be unique.' })
  })

})
