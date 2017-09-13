import Schema from '../schema'
import { toArray, fromArray, isBulkRequest } from '../helper'
import is from 'is-explicit'
import { checkContext } from 'feathers-hooks-common'

export default function populateWithSchema (schema) {

  if (!is(schema, Schema))
    throw new Error('\'sanitize-with-schema\' hook must be initialized with a schema object.')

  return async function (hook) {

    const { method, id, app, service, params: { skipValidation } } = hook

    checkContext(hook, 'before', ['create', 'update', 'patch'], 'sanitize-with-schema')

    if (skipValidation)
      return

    // account for bulk queries
    const isBulk = hook::isBulkRequest()
    const asBulk = hook.data::toArray()

    for (let i = 0; i < asBulk.length; i++) {

      // A set of params that sanitization functions can use to their benefit. Similar
      // to the hook, with an added property for the current service. Also, sending
      // this object prevents sanitization methods from mutating the hook object,
      // respecting encapsulation.
      const arg = { id, app, method, service }

      const doc = asBulk[i]

      const sanitized = await schema.sanitize(doc, arg)

      // id fields would be removed by sanitization, so we'll add them back in
      if (service.id in doc)
        sanitized[service.id] = doc[service.id]

      asBulk[i] = sanitized
    }

    hook.data = isBulk
      ? asBulk
      : asBulk::fromArray()

    return hook

  }

}
