import Schema from '../schema'
import is from 'is-explicit'
import { toArray, fromArray, isBulkRequest } from '../helper'
import { BadRequest } from 'feathers-errors'
import { checkContext } from 'feathers-hooks-common'

/******************************************************************************/
// Exports
/******************************************************************************/

export default function validateWithSchema (schema) {

  if (!is(schema, Schema))
    throw new Error('\'validate-with-schema\' hook must be initialized with a schema object.')

  return async function (hook) {

    const { method, id, app, service, params: { $skipSchema } } = hook

    checkContext(hook, 'before', ['create', 'update', 'patch'], 'validate-with-schema')

    if ($skipSchema)
      return

    const isBulk = hook::isBulkRequest()

    // bulk update requests arn't possible, so if the user accidentally input one,
    // we let it go all the way through the hooks where it will be failed by feathers
    // before it gets to the database adapter
    if (isBulk && method === 'update')
      return

    const asBulk = hook.data::toArray()
    let errors = null

    for (let i = 0; i < asBulk.length; i++) {

      // A set of params that validation functions can use to their benefit. Similar
      // to the hook, with an added property for the current service. Also, sending
      // this object prevents validation methods from mutating the hook object,
      // respecting encapsulation.
      const arg = { id, app, method, service }

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
      errors = isBulk
        ? errors
        : errors::fromArray()

      throw new BadRequest('Validation failed.', { errors })

    // multi create requests take an array of data, while multi patch requests do
    // not. The act of populating and sanitizing essentially converts a patch
    // request to make it look like a create request. Since we can't pass an array
    // of sanitized data to a database adapter, we manually patch each one here.
    } else if (isBulk && method === 'patch') {

      hook.result = []

      for (const doc of asBulk) {
        const id = doc[service.id]

        // TODO What if there's an error?
        const result = await service.patch(id, doc, { $skipSchema: true })
        hook.result.push(result)
      }

    }

    return hook

  }

}
