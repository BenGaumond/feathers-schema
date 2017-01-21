
import App from '../app'
import messageSchema from './message-schema'
import memory from 'feathers-memory'
import { assert } from 'chai'

/* global describe it before after */
//configure messages service

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
          ...messageSchema.hooks,
        ]
      })


    })

    it('Sanitizes schema properties on data', async () => {

      let errors

      try {
        await messages.create({ })
      } catch (err) {
        errors = err.errors
      }

      assert.deepEqual(errors, { body: 'Required.', author: 'Required.'})

    })

    after(async () => await app.end())

  })


})
