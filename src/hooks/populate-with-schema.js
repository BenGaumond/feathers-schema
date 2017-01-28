import Schema from '../schema'
import is from 'is-explicit'
import { isPlainObject } from '../helper'

function fillWithProperties(data = {}, fill = {},  properties) {

  if (!isPlainObject(data))
    data = {}

  for (const property of properties) {

    const { key } = property

    const hasKey = key in data

    if (!hasKey)
      data[key] = fill[key]

    if (hasKey || property.array || !property.properties || !isPlainObject(fill[key]))
      continue

    data[key] = fillWithProperties(data[key], fill[key], property.properties)

  }

  return data

}

export default function populateWithSchema(schema) {

  if (!is(schema, Schema))
    throw new Error('populate-with-schema hook must be initialized with a schema object.')

  return async function(hook, next) {

    const { method, type, id, data } = hook


    try {

      if (type !== 'before')
        throw new Error('The \'populate-with-schema\' hook should only be used as a \'before\' hook.')

      if (method === 'find' || method === 'get' || method === 'remove')
        throw new Error('The \'populate-with-schema\' hook should only be used as a \'create\', \'update\' or \'patch\' hook.')

      if (method !== 'patch')
        return next()

      const service = this

      const doc = await service.get(id)

      hook.data = fillWithProperties(data, doc, schema.properties)

      next(null, hook)

    } catch (err) {

      next(err)
    }

  }

}
