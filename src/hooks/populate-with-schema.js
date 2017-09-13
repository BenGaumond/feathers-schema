import Schema from '../schema'
import is from 'is-explicit'
import { fromArray, isBulkRequest } from '../helper'
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

    if (property.array || !property.properties || !is.plainObject(fill[key]))
      continue

    data[key] = fillWithProperties(data[key], fill[key], property.properties)

  }

  return data

}

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
    if (method === 'create')
      return

    const isBulk = hook::isBulkRequest()

    const isUpdate = method === 'update'

    // We only need run populate on "update" if this is a multiple query
    if (isUpdate && !isBulk)
      return

    const docs = isBulk
      ? await service.find({ query })
      : [ await service.get(id) ]

    for (let i = 0; i < docs.length; i++) {

      // Only need to fill properties if this is a patch request. If it's an update
      // we just need to convert the data and query to an array of documents with
      // the data
      const doc = isUpdate
        ? toObject(data)
        : fillWithProperties(data, docs[i], schema.properties, isUpdate)

      // Place the id on the doc in case it's not included in the Schema
      if (service.id in doc === false)
        doc[service.id] = id || docs[i][service.id]

      docs[i] = doc
    }

    hook.data = isBulk ? docs : docs::fromArray()

    return hook

  }

}
