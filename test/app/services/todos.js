
import memory from 'feathers-memory'
import Schema from '../schema'

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

const after = {

}

export default function() {

  const app = this
  app.use('/todos', memory())

  const todos = app.service('todos')

  todos.before(before)
  todos.after(after)

}
