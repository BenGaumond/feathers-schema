import { expect } from 'chai'
import is from 'is-explicit'

import Schema from '../../lib'
import clear from 'cli-clear'

/* global describe it */

clear()
describe('Schema Class', () => {

  it('is being rebuilt', () => {

    const schema = new Schema({
      title:  { type: String, uppercase: true },
      authors: [{ type: String }],
      // body:   String,
      comments: [{ body: { type: String, lowercase: true }, stars: Number }],
      // date: { type: Date, default: Date.now },
      // hidden: Boolean,
      meta: {

        votes: [{
          type: Number,
          sanitizes: [
            value => value < 0 ? 0 : value > 5 ? 5 : value,
            value => Math.round(value / 0.25) * 0.25
          ]
        }],

        sanitizes(value) {

          while (value.votes.length > 5)
            value.votes.shift()

          return value
        }
        
      }
    })

    schema.sanitize({
      title: 'DOO WAH DITTY DITTY DUM DIDDY TOO',

      authors: ['Jerry Rucker', 'Ben Gaumond'],

      meta: {
        votes: [1,3,1,2,4,4,10,2,1,2.5,19,109,1,0.5,0.1,-1]
      },

      comments: [{
        body: 'YOU DUMMY',
        stars: 0
      },{
        body: 'VERY GOOD',
        stars: 5
      }]

    }).then(res => console.log(res))


  })

})
