
import Schema from '../../lib'
// import ObjectId from 'bson-objectid'

const trim = true, alphanumeric = true, required = true

const schema = new Schema({

  body: {
    type: String,
    length: ['<=', 144],
    trim,
    required
  },

  scores: [{
    type: Number,
    range: [0,5],
    required
  }],

  author: {
    type: String,
    length: ['<=', 20],
    alphanumeric,
    trim,
    required
  },

})

export default schema
