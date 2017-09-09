import Schema from '../schema'
import { array } from '../helper'
import is from 'is-explicit'
import { checkContext } from 'feathers-hooks-common'

export default function populateWithSchema (schema) {

  if (!is(schema, Schema))
    throw new Error('\'sanitize-with-schema\' hook must be initialized with a schema object.')

  return async function (hook) {

    const { method, id, app } = hook

    checkContext(hook, 'before', ['create', 'update', 'patch'], 'sanitize-with-schema')

    // account for bulk queries
    const isBulk = is(hook.data, Array)
    const asBulk = array(hook.data)

    for (let i = 0; i < asBulk.length; i++) {

      // A set of params that sanitization functions can use to their benefit. Similar
      // to the hook, with an added property for the current service. Also, sending
      // this object prevents sanitization methods from mutating the hook object,
      // respecting encapsulation.
      const arg = { id, app, method, service: this }

      const data = asBulk[i]

      const sanitized = await schema.sanitize(data, arg)

      // id fields would be removed by sanitization, so we'll add it back in
      // if the document is being created with a deterministic id
      const manualId = data[this.id]
      if (method === 'create' && manualId)
        sanitized[this.id] = manualId

      asBulk[i] = sanitized
    }

    hook.data = array.unwrap(asBulk, !isBulk)

    return hook

  }

}
