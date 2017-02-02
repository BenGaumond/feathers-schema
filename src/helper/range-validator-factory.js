import parseConfig from './parse-config'
import isPlainObject from './is-plain-object'
import array from './ensure-array'
import is from 'is-explicit'

/******************************************************************************/
// DATA
/******************************************************************************/
const PASS = false

/******************************************************************************/
// HELPER
/******************************************************************************/
//Javascript sorts by unicode order by default
const ascending = (a,b) => a - b

const factory = (getValue, getResult, failMsg) => {

  return input => {

    //null or undefined values pass validation
    if (!is(input))
      return PASS

    const isArray = is(input, Array)

    const results = array(input)
      .map(item => {
        const value = getValue(item)
        return getResult(value)
          ? PASS
          : failMsg
      })

    //return an fail array if results contain at least one failure, and input
    //wasnt an array to begin with
    return array
      .unwrap(
        results,
        !isArray || results.every(r => r == PASS)
      )
  }
}

const DEFAULT_MSGS = {
  '<=': number => `Must be equal to or less than ${number}.`,
  '<': number => `Must be less than ${number}.`,
  '>': number => `Must be more than ${number}.`,
  '>=': number => `Must be equal to or more than ${number}.`,
  '<=>': (min, max) => `Must be between ${min} and ${max}`
}

const DEFAULT_GET_VALUE = input => input
/******************************************************************************/
// EXPORTS
/******************************************************************************/

export default function rangeValidatorFactory(configArgs, getValue = DEFAULT_GET_VALUE, defaultMsgs = DEFAULT_MSGS) {

  if (!is(configArgs, Array))
    throw new Error('configArgs is expected to be an array of config arguments.')

  if (!is(getValue, Function))
    throw new Error('getValue, if defined, must be a function')

  if (!is(defaultMsgs, Object))
    throw new Error('defaultMsgs, if defined, must be an Object')

  let { value, min, max, compare, msg } = parseConfig(configArgs, { //eslint-disable-line prefer-const
    min: Number,
    max: Number,
    value: Number,
    compare: { type: String, default: '<=>' },
    msg: String
  })

  const explicitlyDefined = isPlainObject(configArgs[0])
  const isMax = is(max, Number)
  const isMin = is(min, Number)
  const isValue = is(value, Number)
  const isBetween = compare === '<=>'

  if (explicitlyDefined && isBetween && isValue && !isMin && !isMax)
    throw new Error('Cannot just provide a value to compare a range.')

  else if (explicitlyDefined && isBetween && (!isMin || !isMax))
    throw new Error('For comparing a range, a min and max value is required.')

  else if (explicitlyDefined && isBetween && min >= max)
    throw new Error('Min must be below Max.')

  else if (explicitlyDefined && !isBetween && !isValue)
    throw new Error(`A value is required to compare against ${compare}`)

  //Reduce min and max to explicitly defined values, and order them accordingly.
  //Handles cases where the range validator was called with arguments or an array
  //expression, and they weren't put in order
  const numbers = (explicitlyDefined ? isBetween ? [min, max] : [value] : [min, value, max])
    .filter(v => is(v, Number))
    .sort(ascending)

  //if the validator wasn't explicitly defined, it's possible for there to be three numbers in the array
  if (numbers.length === 3)
    numbers.splice(1,1)

  //more checks to find invalid configurations that arn't explicitly defined
  if (numbers.length === 0)
    throw new Error('Number value required.')

  else if (numbers.length === 1 && isBetween)
    throw new Error('For comparing a range, a min and max value is required.')

  else if (numbers.length === 2 && !isBetween)
    throw new Error(`A value is required to compare against ${compare}`)

  //msgFunc will return the msg defined by the schema creator, if one exists,
  //or it will map to the defaultMsgs object defined by the vaidator creator, if one exists
  //or it will map to the DEFAULT_MSGS object defined above
  const msgFunc = msg
    ? () => msg
    : defaultMsgs[compare]

  if (!is(msgFunc, Function))
    throw new Error('The defaultMsgs object must map <=, <, >, >=, <=> keys to functions that return error strings.')

  const number = numbers[0]

  //build the validator function
  switch (compare) {

  case '<=':
    return factory(getValue, value => value <= number, msgFunc(number))

  case '<':
    return factory(getValue, value => value < number, msgFunc(number))

  case '>':
    return factory(getValue, value => value > number, msgFunc(number))

  case '>=':
    return factory(getValue, value => value >= number, msgFunc(number))

  case '<=>':
    //restructure min and max from the sanitized numbers array
    [min, max] = numbers
    return factory(getValue, value => value >= min && value <= max, msgFunc(min, max))

  default:
    throw new Error('Invalid compare value. Must be one of: <=, <, >, >=, <=>')
  }
}
