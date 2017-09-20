import is from 'is-explicit'

/******************************************************************************/
// Exports
/******************************************************************************/

export function toArray (input) {

  const value = this !== undefined ? this : input

  return is(value, Array)
    ? value
    : [ value ]

}

export function fromArray (...args) {

  let value, index

  if (this !== undefined) {
    ([index = 0] = args)
    value = this
  } else
    ([value, index = 0] = args)

  if (!is(value, Array))
    return value

  // negatives allow indexing from the end of the array, -1 being the last item
  if (index < 0)
    index += value.length

  return value[index]
}

export default toArray
