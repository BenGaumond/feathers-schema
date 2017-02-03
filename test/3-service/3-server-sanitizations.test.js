import App from '../app'
import memory from 'feathers-memory'
import { assert, expect } from 'chai'

/* global describe it before after */

import Schema from '../../src'

const required = true

const author = new Schema({
  name: { type: String, length: [0, 30]}
})

const comment = new Schema({
  body: { type: String, length: [0, 144]},
  rating: { type: Number, range: [0,10] },
  author: {
    type: Number,
    service: 'authors',
    required
  }
})

const article = new Schema({
  body: String,
  author: {
    type: Number,
    service: 'authors',
    required
  },
  comments: [{
    type: Number,
    service: 'comments'
  }]
})

describe('Stock Server Sanitizations', () => {

  describe('service validator', () => {

    let comments, articles, authors, app

    before(async () => {

      app = new App()
      app.use('/authors', memory())
      app.use('/comments', memory())
      app.use('/articles', memory())

      authors = app.service('authors')
      authors.before({
        create: [...author.hooks],
        patch: [...author.hooks],
        update: [...author.hooks]
      })

      comments = app.service('comments')
      comments.before({
        create: [...comment.hooks],
        patch: [...comment.hooks],
        update: [...comment.hooks]
      })

      articles = app.service('articles')
      articles.before({
        create: [...article.hooks],
        patch: [...article.hooks],
        update: [...article.hooks]
      })

      await app.start()

      //seed
      const authorDocs = await authors.create([
        { name: 'Rachel' },
        { name: 'Ben' },
        { name: 'Chris' },
        { name: 'Alice' }
      ])

      const articleDoc = await articles.create({
        body: 'I like cats.',
        author: authorDocs[0].id
      })

      const commentDocs = await comments.create([
        {
          body: 'Meow!',
          author: authorDocs[1].id,
          rating: 10
        }, {
          body: 'They\'re delicious.',
          author: authorDocs[2].id,
          rating: 10
        }
      ])

      await articles.patch(articleDoc.id, {
        comments: commentDocs.map(doc => doc.id)
      })

    })

    it('Requires a service name.', () => {
      expect(() => new Schema({ author: { type: Number, service: true }}))
        .to.throw('name config property is required for this validator.')
    })

    it('Filters out ids that don\'t exist in a given service.', async () => {

      let err

      try {
        await articles.create({
          body: 'Cats SUCK!',
          author: 1000
        })
      } catch (e) {
        err = e.errors
      }

      assert(err, 'No errors returned.')
      assert.equal(err.author, 'Required.')

      const doc = await articles.get(0)
      const updatedDoc = await articles.patch(doc.id, {
        comments: [...doc.comments, 1000, 1001, 1002, 1003]
      })

      assert.deepEqual(doc.comments, updatedDoc.comments)
    })

    const twoForOne = async () => {

      const doc = await articles.get(0)
      const comments = [...doc.comments]
      const updatedDoc = await articles.patch(doc.id, {
        comments: [...doc.comments, ...doc.comments]
      })

      assert.deepEqual(comments, updatedDoc.comments)
    }

    it('Filters out duplicate ids.', twoForOne)

    it('Handles arrays', twoForOne)

    it('Preserves order on array properties.', async () => {

      let aDoc = await articles.get(0)

      await comments.create([
        {
          body: 'Dude wtf',
          author: 0,
          rating: 10
        },
        {
          body: 'Long in the future after the reign of humanity has been'+
            ' reduced to ashes, Cats will reign supreme.',
          author: 3,
          rating: 10
        }
      ])

      const cDocs = await comments.find()

      const updatedComments = cDocs.map(c => c.id)
      updatedComments.reverse()

      aDoc = await articles.patch(aDoc.id, { comments: updatedComments })

      assert.deepEqual(aDoc.comments, updatedComments)

    })

    after(async () => await app.end())

  })

})
