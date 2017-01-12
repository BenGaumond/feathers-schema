
import feathersMemory from 'feathers-memory'
import Schema from '../../lib'

const model = new Schema({

  description: String,

  completed: {
    type: Boolean,
    default: false
  }

})

const before = {
  create: [ model.applyHook ]
}

export default function() {

  const app = this

  const service = feathersMemory()

  app.use('/todos', service)

  app.service('todos')
     .before(before)

}
