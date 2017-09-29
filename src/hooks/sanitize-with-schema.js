import Schema from '../schema'
import { toArray, fromArray, isBulkRequest } from '../helper'
import is from 'is-explicit'
import { checkContext } from 'feathers-hooks-common'

export default function sanitizeWithSchema (schema) {

  if (!is(schema, Schema))
    throw new Error('\'sanitize-with-schema\' hook must be initialized with a schema object.')

  return async function (hook) {

    const { method, id, app, service, params: { $skipSchema } } = hook

    checkContext(hook, 'before', ['create', 'update', 'patch'], 'sanitize-with-schema')

    if ($skipSchema)
      return

    // account for bulk queries
    const isBulk = hook::isBulkRequest()

    // bulk update requests arn't possible, so if the user accidentally input one,
    // we let it go all the way through the hooks where it will be failed by feathers
    // before it gets to the database adapter
    if (isBulk && method === 'update')
      return

    const asBulk = hook.data::toArray()

    for (let i = 0; i < asBulk.length; i++) {

      // A set of params that sanitization functions can use to their benefit. Similar
      // to the hook, with an added property for the current service. Also, sending
      // this object prevents sanitization methods from mutating the hook object,
      // respecting encapsulation.
      const arg = { id, app, method, service }

      const doc = asBulk[i]

      const sanitized = await schema.sanitize(doc, arg)

      // if id field is not included in sanitization, we add it back in
      if (service.id in doc && service.id in sanitized === false)
        sanitized[service.id] = doc[service.id]

      asBulk[i] = sanitized
    }

    hook.data = isBulk
      ? asBulk
      : asBulk::fromArray()

    return hook

  }

}
