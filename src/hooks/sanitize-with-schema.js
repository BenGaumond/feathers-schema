import Schema from '../schema'
import is from 'is-explicit'

export default function populateWithSchema(schema) {

  if (!is(schema, Schema))
    throw new Error('\'sanitize-with-schema\' hook must be initialized with a schema object.')

  return async function(hook, next) {

    const { type, method, id, app } = hook

    try {

      //Ensure hook can run
      if (type !== 'before')
        throw new Error('The \'sanitize-with-schema\' hook should only be used as a \'before\' hook.')

      if (method !== 'create' && method !== 'update' && method !== 'patch')
        throw new Error('The \'sanitize-with-schema\' hook should only be used as a \'create\', \'update\' or \'patch\' hook.')

      //A set of params that sanitization functions can use to their benefit. Similar
      //to the hook, with an added property for the current service. Also, sending
      //this object prevents sanitization methods from mutating the hook object,
      //respecting encapsulation.
      const arg = { id, app, method, data: hook.data, service: this }

      hook.data = await schema.sanitize(arg.data, arg)

      return next(null, hook)

    } catch (err) {

      next(err)

    }

  }

}
