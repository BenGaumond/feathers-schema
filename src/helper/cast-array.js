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

export function fromArray (input) {

  const value = this !== undefined ? this : input

  return is(value, Array)
    ? value[0]
    : value
}

export default toArray
