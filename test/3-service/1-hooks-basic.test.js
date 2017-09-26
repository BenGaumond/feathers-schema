
import App from '../app'
import memory from 'feathers-memory'
import chai, { assert, expect } from 'chai'
import asPromised from 'chai-as-promised'
import Schema from '../../src'
import is from 'is-explicit'

chai.use(asPromised)

/* global describe it before after */

const trim = true, alphanumeric = true, required = true // eslint-disable-line

const messageSchema = new Schema({

  body: {
    type: String,
    length: ['<=', 144],
    trim,
    required
  },

  scores: [{
    type: Number,
    range: [0, 5],
    required,
    default: () => [ 0 ]
  }],

  author: {
    type: String,
    length: ['<=', 20],
    alphanumeric,
    trim,
    required
  },

  meta: {
    keywords: String,
    location: String
  }

})

describe('Hooks', () => {

  let id, app, messages

  describe('Populate hook', () => {

    let populatedData

    before(async () => {

      app = new App()
      app.use('/messages', memory())
      messages = app.service('messages')
      await app.start()

      messages.before({
        create: [
          ...messageSchema.hooks
        ],
        patch: [
          messageSchema.hooks.populate,
          hook => { populatedData = hook.data }
        ],
        update: [
          messageSchema.hooks.populate,
          hook => { populatedData = hook.data },
          messageSchema.hooks.sanitize,
          messageSchema.hooks.validate
        ]
      })

      try {
        const message = await messages.create({
          body: 'My first message.',
          author: 'Joseph',
          scores: [ 0 ]
        })

        id = message.id

      } catch (err) {
        console.log(err.errors)
        throw err
      }

    })

    it('Populates missing schema properties on data with values from database', async () => {

      try {

        await messages.patch(id, { body: 'Message has been patched.' })

      } catch (err) {
        throw err
      }

      assert('author' in populatedData, 'Author is missing from patch data')
      assert(populatedData.body === 'Message has been patched.', 'Patch data did not get applied.')

    })

    it('Populates nested fields on Object properties without defined sub propeties', async () => {

      const app = new App()
      app.use('/products', memory())

      const products = app.service('products')

      const { hooks } = new Schema({
        name: String,
        version: { type: Number, range: ['>=', 0] },
        meta: Object
      })

      products.before({
        patch: [
          hooks.populate,
          hook => { populatedData = hook.data }
        ]
      })

      const box = await products.create({
        name: 'Box',
        version: 0,
        meta: {
          sides: 6,
          packingCode: 'non-fragile',
          padding: {
            bottom: 'cellophane'
          },
          colors: {
            red: true,
            blue: true
          }
        }
      })

      await products.patch(box.id, {
        version: 1,
        meta: {
          sides: {
            open: 6,
            closed: 4
          },
          padding: {
            top: 'foam'
          },
          colors: ['green', 'grey']
        }
      })

      const should = {
        name: 'Box',
        version: 1,
        meta: {
          sides: {
            open: 6,
            closed: 4
          },
          packingCode: 'non-fragile',
          padding: {
            bottom: 'cellophane',
            top: 'foam'
          },
          colors: ['green', 'grey']
        },
        id: box.id
      }

      assert.deepEqual(populatedData, should, 'Property merging did not work on Object type')
    })

    it('Populates nested fields ANY properties that happen to be Objects', async () => {

      const app = new App()
      app.use('/robots', memory())

      const robots = app.service('robots')

      const ANY = null

      const { hooks } = new Schema({
        name: String,
        ai: ANY
      })

      robots.before({
        patch: [
          hooks.populate,
          hook => { populatedData = hook.data }
        ]
      })

      const df = await robots.create({
        name: 'DeathFucker',
        ai: 'remote controlled'
      })

      await robots.patch(df.id, {
        name: 'ChessPlayer',
        ai: {
          nodes: 6,
          handling: {
            sprocket: 'retroactive',
            bitmask: [1, 2, 4, 16, 64]
          }
        }
      })

      let should = {
        name: 'ChessPlayer',
        ai: {
          nodes: 6,
          handling: {
            sprocket: 'retroactive',
            bitmask: [1, 2, 4, 16, 64]
          }
        },
        id: df.id
      }

      assert.deepEqual(should, populatedData, 'replacing ANY data did not work')

      await robots.patch(df.id, {
        ai: {
          handling: {
            bitmask: [1, 2, 4, 8],
            avoidance: {
              top: false,
              back: true
            }
          }
        }
      })

      should = {
        name: 'ChessPlayer',
        ai: {
          nodes: 6,
          handling: {
            sprocket: 'retroactive',
            bitmask: [1, 2, 4, 8],
            avoidance: {
              top: false,
              back: true
            }
          }
        },
        id: df.id
      }

      assert.deepEqual(should, populatedData, 'object merging on ANY type did not work')

    })

    it('Only dispatches during a patch hook', async () => {

      let errors
      try {
        await messages.update(id, { body: 'Message has been updated.' })
      } catch (err) {
        errors = err.errors
      }

      assert.deepEqual(errors, { author: 'Required.' }, 'update was filled by populate')
    })

    it('Does not allow batch update', () => {

      return expect(messages.update(null, { body: 'Message has been updated.' }))
        .to.eventually.be
        .rejectedWith('You can not replace multiple instances. Did you mean \'patch\'?')

    })

    it('Accounts for services with pagination configured', async () => {

      const app = new App()
      app.use('/users', memory({
        paginate: {
          default: 5,
          max: 100
        }
      }))

      const users = app.service('users')

      const { hooks } = new Schema({
        name: String,
        gender: { String, enum: [ 'male', 'female', 'other' ] }
      })

      users.before({
        patch: [
          hooks.populate,
          hook => { populatedData = hook.data }
        ]
      })

      await users.create([
        { name: 'Jake', gender: 'male' },
        { name: 'Jerry', gender: 'male' },
        { name: 'Jane', gender: 'female' },
        { name: 'Jill', gender: 'female' },
        { name: 'Xerxes', gender: 'other' }
      ])

      await expect(users.patch(null, { name: '[Redacted]' })).to.eventually.be.fulfilled

      assert(
        is(populatedData, Array) && populatedData.every(doc => 'gender' in doc && 'id' in doc),
        'populate data did not work as expected'
      )

    })

    it('May only be used as a \'before\', \'update\', \'patch\' or \'create\' hook.', async () => {

      const test = app.use('/test', memory())
        .service('test')

      const pop = [ messageSchema.hooks.populate ]
      test.before({
        find: pop,
        get: pop,
        remove: pop
      })

      test.after({
        all: pop
      })

      const run = async (method, id, expected) => {

        const args = id instanceof Array ? id : [id]

        let message = null
        try {
          await test[method](...args)
        } catch (err) {
          message = err.message
        }

        assert.equal(message, expected)

      }

      const BeforeErr = 'The \'populate-with-schema\' hook can only be used as a \'before\' hook.'
      const MethodErr = 'The \'populate-with-schema\' hook can only be used on the \'["create","update","patch"]\' service method(s).'

      await run('create', {}, BeforeErr)
      await run('patch', [0, {}], BeforeErr)
      await run('update', [0, {}], BeforeErr)
      await run('find', {}, MethodErr)
      await run('get', 0, MethodErr)
      await run('remove', 0, MethodErr)

    })

    it('Handles multi requests', async () => {

      await app.service('messages').remove(null)
      await app.service('messages').create({ author: 'James', body: 'You\'re a wizard, Harry!' })
      await app.service('messages').create({ author: 'Harry', body: 'Shut up, James.' })

      await app.service('messages').find({})

      const body = 'I get along with you.'

      await expect(app.service('messages').patch(null, { body }))
        .to.eventually.be.fulfilled

      assert(populatedData.every(doc => doc.author !== null), 'populated data does not match')

    })

    after(async () => app.end())

  })

  describe('Sanitize hook', () => {

    let sanitizedData

    before(async () => {

      app = new App()
      app.use('/messages', memory())
      messages = app.service('messages')
      await app.start()

      messages.before({
        create: [
          messageSchema.hooks.sanitize,
          hook => { sanitizedData = { ...hook.data } }
        ],
        patch: [
          messageSchema.hooks.populate,
          messageSchema.hooks.sanitize,
          hook => { sanitizedData = { ...hook.data } }
        ]
      })

      const message = await messages.create({
        body: ' message that needs trimming ',
        author: '  Joe User  '
      })

      id = message.id

    })

    it('Sanitizes schema properties on data', () => {

      assert.deepEqual(sanitizedData, {
        body: 'message that needs trimming',
        author: 'Joe User',
        meta: null,
        scores: [ 0 ]
      })
    })

    it('May only be used as a \'before\', \'update\', \'patch\' or \'create\' hook.', async () => {

      const test = app.use('/test', memory())
        .service('test')

      const san = [ messageSchema.hooks.sanitize ]
      test.before({
        find: san,
        get: san,
        remove: san
      })

      test.after({
        all: san
      })

      const run = async (method, id, expected) => {

        const args = id instanceof Array ? id : [id]

        let message = null
        try {
          await test[method].apply(test, args)
        } catch (err) {
          message = err.message
        }

        assert.equal(message, expected)

      }

      const BeforeErr = 'The \'sanitize-with-schema\' hook can only be used as a \'before\' hook.'
      const MethodErr = 'The \'sanitize-with-schema\' hook can only be used on the \'["create","update","patch"]\' service method(s).'

      await run('create', {}, BeforeErr)
      await run('patch', [0, {}], BeforeErr)
      await run('update', [0, {}], BeforeErr)
      await run('find', {}, MethodErr)
      await run('get', 0, MethodErr)
      await run('remove', 0, MethodErr)

    })

    it('fills data with ids if they were removed by sanitization', async () => {

      await messages.patch(id, { body: '[Redacted]' })

      assert.equal(sanitizedData.id, id, 'id not placed in sanitized data')

    })

    it('does not fill ids if sanitize didn\'t remove them', async () => {

      const userSchema = new Schema({
        name: String,
        id: Number
      })

      let sanitized

      const app = new App()

      app.use('/users', memory())
      const users = app.service('users')
      users.before({
        create: [
          userSchema.hooks.sanitize,
          hook => { sanitized = { ...hook.data } }
        ],
        patch: [
          userSchema.hooks.populate, // populate needed to provide data id to sanitize
          userSchema.hooks.sanitize,
          hook => { sanitized = { ...hook.data } }
        ]
      })

      const ben = await users.create({
        name: 'Ben',
        id: '135'
      })

      assert(sanitized.id === 135, 'sanitize did not cast id to a number')

      await users.patch(ben.id, {
        name: 'Ben Gaumond'
      })

      assert.equal(sanitized.id, 135, 'sanitized id not kept')

    })

    after(async () => app.end())

  })

  const quicksetup = async () => {

    app = new App()
    app.use('/messages', memory())
    messages = app.service('messages')
    await app.start()

    messages.before({
      create: [ ...messageSchema.hooks ],
      patch: [ ...messageSchema.hooks ],
      update: [ ...messageSchema.hooks ]
    })

  }

  describe('Vaidate hook', () => {

    before(quicksetup)

    it('Validates schema properties on data', async () => {

      let errors

      try {
        await messages.create({
          body: 'omfg u are such a noob i b4ng3d ur mom l2p spawncampin f4& $UCKK1T punk!'.repeat(20),
          author: '$$-420-BL@ZE-K1N&-$$',
          scores: null
        })
      } catch (err) {
        errors = err.errors
      }

      assert.deepEqual(errors, {
        body: 'Must have 144 or less characters.',
        author: 'May only contain letters and numbers.'
      })

    })

    it('May only be used as a \'before\', \'update\', \'patch\' or \'create\' hook.', async () => {

      const test = app.use('/test', memory())
        .service('test')

      const val = [ messageSchema.hooks.validate ]
      test.before({
        find: val,
        get: val,
        remove: val
      })

      test.after({
        all: val
      })

      const run = async (method, id, expected) => {

        const args = id instanceof Array ? id : [id]

        let message = null
        try {
          await test[method].apply(test, args)
        } catch (err) {
          message = err.message
        }

        assert.equal(message, expected)

      }

      const BeforeErr = 'The \'validate-with-schema\' hook can only be used as a \'before\' hook.'
      const MethodErr = 'The \'validate-with-schema\' hook can only be used on the \'["create","update","patch"]\' service method(s).'

      await run('create', {}, BeforeErr)
      await run('patch', [0, {}], BeforeErr)
      await run('update', [0, {}], BeforeErr)
      await run('find', {}, MethodErr)
      await run('get', 0, MethodErr)
      await run('remove', 0, MethodErr)

    })

    after(async () => app.end())

  })

  describe('Combined Hooks', () => {

    before(quicksetup)

    it('Can handle bulk \'create\' and \'patch\' queries. ', async () => {

      const createData = Array.from({ length: 20 }, (v, i) => Object({ body: `Message ${i}`, author: `Author${i}`, scores: [0] }))

      await expect(messages.create(createData)).to.eventually.be.fulfilled
      const results = await messages.patch(null, { body: '[Redacted]' })

      assert(results.every(doc => doc.body === '[Redacted]'), 'Patch didnt work')
    })

    it('allows manual create ids', async () => {

      const id = 42919
      const doc = await messages.create({ body: 'Whatever', author: 'Ben', scores: [1, 2, 3], id })

      assert.equal(doc.id, id, ' Ids should be equal')
    })

    it('allow properties to be cleared', async () => {

      let doc = await messages.create({ body: 'Very good', author: 'Jeeves', scores: [0], meta: { keywords: 'one', location: 'canada' } })

      doc = await messages.patch(doc.id, { meta: { keywords: '', location: 'usa' } })

      assert.deepEqual(doc.meta, { keywords: null, location: 'usa' })

    })

    after(async () => app.end())

  })

})
