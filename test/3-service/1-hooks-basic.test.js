
import App from '../app'
import memory from 'feathers-memory'
import { assert } from 'chai'

/* global describe it before after */
//configure messages service

import Schema from '../../lib'
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

    it('Can only be used as a before update/patch or create hook.')

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

    it('Can only be used as a before update/patch or create hook.')


    after(async () => await app.end())

  })

  describe('Vaidate hook', () => {


    before(async () => {

      app = new App()
      app.use('/messages', memory())
      messages = app.service('messages')
      await app.start()

      messages.before({
        create:[
          messageSchema.hooks.sanitize,
          messageSchema.hooks.validate
        ]
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

    it('Can only be used as a before update/patch or create hook.')


    after(async () => await app.end())

  })

})
