import Schema from '../schema'
import is from 'is-explicit'

import { fromArray, isBulkRequest } from '../helper'
import { ANY } from '../types'

import { checkContext } from 'feathers-hooks-common'

/******************************************************************************/
// Helper
/******************************************************************************/

function toObject (input) {
  const obj = this === undefined ? input : this

  return is.plainObject(obj)
    ? { ...obj }
    : { }
}

function fillWithProperties (data, fill = {}, properties) {

  data = data::toObject()

  for (const property of properties) {

    const { key } = property

    if (key in data === false)
      data[key] = fill[key] === undefined ? null : fill[key]

    if (property.array || !is.plainObject(fill[key]))
      continue

    const isGeneric = !property.properties || property.type === ANY
    if (isGeneric)
      data[key] = fillWithGeneric(data[key], fill[key])
    else
      data[key] = fillWithProperties(data[key], fill[key], property.properties)

  }

  return data

}

// If the schema is of type Object, but it has no sub properties, we want the
// populate behaviour to be as similar as possible to if it had. There are a couple
// of subtle differences, but if people arn't using explicit types for their sub
// properties, they shouldn't care anyway.

function fillWithGeneric (data, fill = {}) {

  data = data::toObject()

  for (const key in fill) {

    if (key in data === false)
      data[key] = fill[key] === undefined ? null : fill[key]

    if (!is(data[key], Array) && is.plainObject(fill[key]))
      data[key] = fillWithGeneric(data[key], fill[key])

  }

  return data

}

// TODO delete, old version
// function fillWithProperties (data, fill = {}, properties) {
//
//   data = data::toObject()
//
//   for (const property of properties) {
//
//     const { key } = property
//
//     if (key in data === false)
//       data[key] = fill[key] === undefined ? null : fill[key]
//
//     if (property.array || !property.properties || !is.plainObject(fill[key]))
//       continue
//
//     data[key] = fillWithProperties(data[key], fill[key], property.properties)
//
//   }
//
//   return data
//
// }

/******************************************************************************/
// Exports
/******************************************************************************/

export default function populateWithSchema (schema) {

  if (!is(schema, Schema))
    throw new Error('populate-with-schema hook must be initialized with a schema object.')

  return async function (hook) {

    const { method, data, service, id, params: { query, skipValidation } } = hook

    checkContext(hook, 'before', ['create', 'update', 'patch'], 'populate-with-schema')

    if (skipValidation)
      return

    // Populate needs to run on patch and update hooks to ensure that all fields
    // are filled, and that bulk update requests have been converted to arrays.
    // Create requests will be fine the way they are, bulk or not.
    if (method !== 'patch')
      return

    const isBulk = hook::isBulkRequest()

    const docs = isBulk
      ? await service.find({ query, paginate: false })
      : [ await service.get(id) ]

    for (let i = 0; i < docs.length; i++) {
      const doc = fillWithProperties(data, docs[i], schema.properties, service.id)

      // Fill ID
      doc[service.id] = docs[i][service.id]

      // Replace
      docs[i] = doc
    }

    hook.data = isBulk ? docs : docs::fromArray()

    return hook

  }

}
