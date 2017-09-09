import Schema from '../schema'
import is from 'is-explicit'
import { array } from '../helper'
import { checkContext } from 'feathers-hooks-common'

function fillWithProperties (data = {}, fill = {}, properties) {

  if (!is.plainObject(data))
    data = {}

  for (const property of properties) {

    const { key } = property

    const hasKey = key in data

    if (!hasKey)
      data[key] = fill[key] === undefined ? null : fill[key]

    if (property.array || !property.properties || !is.plainObject(fill[key]))
      continue

    data[key] = fillWithProperties(data[key], fill[key], property.properties)

  }

  return data

}

export default function populateWithSchema (schema) {

  if (!is(schema, Schema))
    throw new Error('populate-with-schema hook must be initialized with a schema object.')

  return async function (hook) {

    const { method, data, service } = hook

    checkContext(hook, 'before', ['create', 'update', 'patch'], 'populate-with-schema')

    if (method !== 'patch')
      return

    // acount for bulk queries
    const isBulk = is(data, Array)
    const asBulk = array(data)

    for (let i = 0; i < asBulk.length; i++) {

      const data = asBulk[i]

      // If this is a bulk request, hook.id will be null, and the required id will be
      // in the patch data. If not, it will through a 'no record for undefined' error
      // as it should
      const id = isBulk ? data[service.id] : hook.id

      const doc = await service.get(id)

      asBulk[i] = fillWithProperties(data, doc, schema.properties)

    }

    hook.data = array.unwrap(asBulk, !isBulk)

    return hook

  }

}
