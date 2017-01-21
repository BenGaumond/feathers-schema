import Schema from '../schema'
import is from 'is-explicit'
import { BadRequest } from 'feathers-errors'

export default function populateWithSchema(schema) {

  if (!is(schema, Schema))
    throw new Error('\'validate-with-schema\' hook must be initialized with a schema object.')

  const options = schema.options

  return async function(hook) {

    const { type, method, id, app, params } = hook

    //Ensure hook can run

    if (type !== 'before')
      throw new Error('The \'validate-with-schema\' hook should only be used as a \'before\' hook.')

    if (method !== 'create' && method !== 'update' && method !== 'patch')
      throw new Error('The \'validate-with-schema\' hook should only be used as a \'create\', \'update\' or \'patch\' hook.')

    const { provider, skipValidation, user } = params

    //internal calls may skip validations, or the schema may be extended to allow
    //users to skip validation
    if (skipValidation && (!provider || options.canSkipValidation(user)))
      return

    //A set of params that validation functions can use to their benefit. Similar
    //to the hook, with an added property for the current service. Also, sending
    //this object prevents validation methods from mutating the hook object,
    //respecting encapsulation.
    const arg = { id, app, method, data: hook.data, service: this }

    const errors = await schema.validate(arg.data, arg)

    //errors will be an object if validation failed. If so, wrap it in a BadRequest
    if (errors)
      throw new BadRequest('Validation failed.', { errors })

  }

}
