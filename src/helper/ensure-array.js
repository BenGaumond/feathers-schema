import is from 'is-explicit'

export default function ensureArray(input, condition = true) {

  if (!condition)
    return input

  return is(input, Array) ? input : [input]

}

ensureArray.unwrap = (input, condition = true) => {

  if (!condition)
    return input

  return is(input, Array) ? input[0] : input
}
