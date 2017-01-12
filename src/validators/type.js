import is from 'is-explicit'
import { castTo, checkErrorMsg, parseValidatorConfig } from '../helper'

export default function type(...config) {

  const { func, arrayOf, msg } = parseValidatorConfig(config, 'func', 'arrayOf', 'msg')

  if (!is(func, Function))
    throw new Error('type validator configuration requires a Function as a type property.')

  checkErrorMsg(msg)

  return value => {

    //undefined values pass, as they should only fail in the property is required
    if (!is(value))
      return false

    if (arrayOf && !is(value, Array))
      return msg || `Must supply an Array of ${func.name}s`

    const values = arrayOf ? value : [value]

    try {
      for (let i = 0; i < values.length; i++) {
        const casted = castTo(values[i], type)

        if (!is(casted, type) && casted !== null)
          return msg || `Cannot cast ${value} to ${func.name}`
      }
    } catch (err) {
      return msg || err.message
    }

    return false
  }
}
