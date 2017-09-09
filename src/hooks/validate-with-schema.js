import Schema from '../schema'
import is from 'is-explicit'
import { array } from '../helper'
import { BadRequest } from 'feathers-errors'
import { checkContext } from 'feathers-hooks-common'

export default function populateWithSchema (schema) {

  if (!is(schema, Schema))
    throw new Error('\'validate-with-schema\' hook must be initialized with a schema object.')

  const options = schema.options

  return async function (hook) {

    const { method, id, app, params } = hook

    checkContext(hook, 'before', ['create', 'update', 'patch'], 'validate-with-schema')

    const { provider, skipValidation, user } = params

    // internal calls may skip validations, or the schema may be extended to allow
    // users to skip validation
    if (skipValidation && (!provider || options.canSkipValidation(user)))
      return

    // account for bulk queries
    const isBulk = is(hook.data, Array)
    const asBulk = array(hook.data)
    let errors = null

    for (let i = 0; i < asBulk.length; i++) {

      // A set of params that validation functions can use to their benefit. Similar
      // to the hook, with an added property for the current service. Also, sending
      // this object prevents validation methods from mutating the hook object,
      // respecting encapsulation.
      const arg = { id, app, method, service: this }

      const data = asBulk[i]

      const result = await schema.validate(data, arg)
      if (!result)
        continue

      errors = errors || []
      errors[i] = result

    }

    // errors will be an array if validation failed. If so, wrap it in a BadRequest
    if (errors) {
      // results that didn't fail should be cast to false
      errors = errors.map(result => result === undefined ? false : result)
      // should only be an array if this is a bulk request
      errors = array.unwrap(errors, !isBulk)

      throw new BadRequest('Validation failed.', { errors })
    }

  }

}
