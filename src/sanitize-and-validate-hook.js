import is from 'is-explicit'
import Schema from './schema'
import { hasIn, getIn, setIn } from './helper'
import { BadRequest } from 'feathers-errors'

/******************************************************************************/
// Helper
/******************************************************************************/

async function fillPatchData(paths, { id, data, service }) {

  const filled = {}

  const doc = await service.get(id)

  paths.forEach(path => {

    const value = hasIn(data, path)
      ? getIn(data, path)
      : getIn(doc, path)

    setIn(filled, path, value)

  })

  return filled

}

/******************************************************************************/
// Exports
/******************************************************************************/

export default function sanitizeAndValidate(schema) {

  if (!is(schema, Object))
    throw new Error('To use the "sanitize-and-validate" hook, you must provide a schema.')

  if (!is(schema, Schema))
    schema = new Schema(schema)

  const options = schema.options

  return async function(hook, next) {

    const { type, method, params, id, app } = hook

    //Ensure hook can run
    try {

      if (type !== 'before')
        throw new Error('The "sanitize-and-validate" hook should only be used as a "before" hook.')

      if (method !== 'create' && method !== 'update' && method !== 'patch')
        throw new Error('The "sanitize-and-validate" hook should only be used as a "create", "update" or "patch" hook.')

      const { provider, skipValidation, user } = params

      //internal calls may skip validations, or the schema may be extended to allow
      //users to skip validation
      if (skipValidation && (!provider || options.canSkipValidation(user)))
        return next()

      //A set of params that sanitization and validation functions can use to
      //their benefit. Similar to the hook, with an added property for the
      //current service. Also, sending this object prevents s&v methods from
      //mutating the hook object, respecting encapsulation.
      const arg = { id, app, method, data: hook.data, service: this }

      if (method === 'patch' && options.fillPatchData)
        arg.data = hook.data = await fillPatchData(schema, arg)

      arg.data = hook.data = await schema.sanitize(arg.data, arg)
      let errors = await schema.validate(arg.data, arg)

      //errors will be an object if validation failed. If so, wrap it in a BadRequest
      if (errors)
        errors = new BadRequest('Validation failed.', { errors })

      next(errors, hook)

    } catch (err) {
      return next(err, hook)
    }

  }

}
