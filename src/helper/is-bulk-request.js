import is from 'is-explicit'

/******************************************************************************/
// Exports
/******************************************************************************/

export default function isBulkRequest (input) {

  const hook = this === undefined ? input : this

  const { method, id, data } = hook

  const isView = method === 'find' || method === 'get'
  const isCreate = method === 'create'

  const isBulkCreate = !isView && isCreate && is(data, Array)
  const isBulkEditOrDelete = !isView && !isCreate && !is(id)

  return isBulkCreate || isBulkEditOrDelete

}
