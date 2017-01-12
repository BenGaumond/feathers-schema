import is from 'is-explicit'
import { compareId, getIn, checkErrorMsg, parseValidatorConfig } from '../helper'

export default function unique(...config) {

  const { msg } = parseValidatorConfig(config, 'msg')

  checkErrorMsg(msg)

  return async (value, { path, id, service }) => {

    const idField = service.id

    //undefined values pass, as they should only fail if the property is required
    if (!is(value))
      return false

    const results = await service.find()

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (compareId(id, result[idField]))
        continue

      if (getIn(result, path) === value)
        return msg || 'Must be unique.'
    }

    return false

  }
}
