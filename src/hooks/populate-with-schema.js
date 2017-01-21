import Schema from '../schema'
import is from 'is-explicit'

export default function populateWithSchema(schema) {

  if (!is(schema, Schema))
    throw new Error('populate-with-schema hook must be initialized with a schema object.')

  return async function(hook, next) {

    const { method, type, id, data } = hook

    if (method !== 'patch')
      return next()

    try {

      if (type !== 'before')
        throw new Error('populate-with-schema hook should only be used as a before hook.')

      const service = this

      const doc =  await service.get(id)

      // hook.data = {...doc, ...data}
      //TODO implement proper populating, by walking the properties

      next(null, hook)

    } catch (err) {

      next(err)
    }

  }

}
