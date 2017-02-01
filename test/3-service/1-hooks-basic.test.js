
import App from '../app'
import memory from 'feathers-memory'
import { assert } from 'chai'

/* global describe it before after */
//configure messages service

import Schema from '../../src'
// import ObjectId from 'bson-objectid'

const trim = true, alphanumeric = true, required = true

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
    required
  }],

  author: {
    type: String,
    length: ['<=', 20],
    alphanumeric,
    trim,
    required
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
        patch:[
          messageSchema.hooks.populate,
          hook => { populatedData = hook.data }
        ],
        update: [
          ...messageSchema.hooks
        ]
      })

      const message = await messages.create({
        body: 'My first message.',
        author: 'Joe User'
      })

      id = message.id

    })

    it('Populates missing schema properties on data with values from database', async () => {

      try {

        await messages.patch(id, { body: 'Message has been patched.'})

      } catch (err) {
        throw err
      }

      assert('author' in populatedData, 'Author is missing from patch data')
      assert(populatedData.body === 'Message has been patched.', 'Patch data did not get applied.')

    })

    it('Only dispatches during a patch hook', async () => {

      let authorError
      try {
        await messages.update(id, { body: 'Message has been updated.'})
      } catch (err) {
        authorError = err.errors.author
      }

      assert.equal(authorError, 'Required.')
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

      const run = async (method, id, expected)=> {

        const args = id instanceof Array ? id : [id]

        let message = null
        try {
          await test[method].apply(test, args)
        } catch (err) {
          message = err.message
        }

        assert.equal(message, expected)

      }

      const BeforeErr = 'The \'populate-with-schema\' hook should only be used as a \'before\' hook.'
      const MethodErr = 'The \'populate-with-schema\' hook should only be used as a \'create\', \'update\' or \'patch\' hook.'

      await run('create', {}, BeforeErr)
      await run('patch', [0, {}], BeforeErr)
      await run('update', [0, {}], BeforeErr)
      await run('find', {}, MethodErr)
      await run('get', 0, MethodErr)
      await run('remove', 0, MethodErr)

    })

    after(async () => await app.end())

  })

  describe('Sanitize hook', () => {

    let sanitizedData

    before(async () => {

      app = new App()
      app.use('/messages', memory())
      messages = app.service('messages')
      await app.start()

      messages.before({
        create:[
          messageSchema.hooks.sanitize,
          hook => { sanitizedData = hook.data }
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
        author: 'Joe User'
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

      const run = async (method, id, expected)=> {

        const args = id instanceof Array ? id : [id]

        let message = null
        try {
          await test[method].apply(test, args)
        } catch (err) {
          message = err.message
        }

        assert.equal(message, expected)

      }

      const BeforeErr = 'The \'sanitize-with-schema\' hook should only be used as a \'before\' hook.'
      const MethodErr = 'The \'sanitize-with-schema\' hook should only be used as a \'create\', \'update\' or \'patch\' hook.'

      await run('create', {}, BeforeErr)
      await run('patch', [0, {}], BeforeErr)
      await run('update', [0, {}], BeforeErr)
      await run('find', {}, MethodErr)
      await run('get', 0, MethodErr)
      await run('remove', 0, MethodErr)

    })

    after(async () => await app.end())

  })

  describe('Vaidate hook', () => {

    before(async () => {

      app = new App()
      app.use('/messages', memory())
      messages = app.service('messages')
      await app.start()

      messages.before({
        create: [ ...messageSchema.hooks ],
        patch: [ ...messageSchema.hooks ],
        update: [ ...messageSchema.hooks ]
      })

    })

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
        author: 'May only contain letters and numbers.',
        scores: 'Required.'
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

      const run = async (method, id, expected)=> {

        const args = id instanceof Array ? id : [id]

        let message = null
        try {
          await test[method].apply(test, args)
        } catch (err) {
          message = err.message
        }

        assert.equal(message, expected)

      }

      const BeforeErr = 'The \'validate-with-schema\' hook should only be used as a \'before\' hook.'
      const MethodErr = 'The \'validate-with-schema\' hook should only be used as a \'create\', \'update\' or \'patch\' hook.'

      await run('create', {}, BeforeErr)
      await run('patch', [0, {}], BeforeErr)
      await run('update', [0, {}], BeforeErr)
      await run('find', {}, MethodErr)
      await run('get', 0, MethodErr)
      await run('remove', 0, MethodErr)

    })

    after(async () => await app.end())

  })


  describe('Bulk Queries', () => {

    before(async () => {

      app = new App()
      app.use('/messages', memory())
      messages = app.service('messages')
      await app.start()

      messages.before({
        create: [ ...messageSchema.hooks ],
        patch: [ ...messageSchema.hooks ],
        update: [ ...messageSchema.hooks ]
      })

    })

    it('All Hooks can handle bulk \'create\' and \'patch\' queries. ', async () => {

      let errors
      let results

      const createData = Array.from({length: 20}, (v,i) => Object({ body: `Message ${i}`, author: `Author${i}`, scores: [0] }))

      try {
        results = await messages.create(createData)
      } catch (err) {
        errors = err
      }

      if (errors && errors.message)
        throw errors.message

      errors = null
      const patchData = results.map(data => Object({id: data.id, body: '[Redacted]'}))

      try {
        results = await messages.patch(null, patchData)
      } catch (err) {
        errors = err
      }

      if (errors && errors.message)
        throw errors.message

    })

    after(async () => await app.end())

  })
})
