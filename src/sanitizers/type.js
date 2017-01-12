import is from 'is-explicit'
import { castTo, parseValidatorConfig } from '../helper'

export default function type(...config) {

  const { func, arrayOf } = parseValidatorConfig(config, 'func', 'arrayOf')

  if (!is(func, Function))
    throw new Error('type validator configuration requires a Function as a type property.')

  return value => {

    //undefined values pass, as they should only fail if the property is required
    if (!is(value))
      return arrayOf ? [] : value

    if (!arrayOf)
      return castTo(value, func)

    const values = arrayOf ? value : [value]
    return values
      .map(value => castTo(value, func))
      .filter(value => value !== null)

  }
}
