import sanitizeAndValidate from './sanitize-and-validate-hook'
import { getIn, setIn } from './helper'
import is from 'is-explicit'

const DEFAULT_OPTIONS = {
  fillPatchData: false,
  canSkipValidation: () => false
}

export default class Schema {

  constructor(definitions, options) {

    //Check options
    if (is(options) && !is(options, Object))
      throw new Error('options, if supplied, is expected to be an object')

    this.options = { ...(options || DEFAULT_OPTIONS)}

    if (is(this.options.canSkipValidation, Boolean))
      this.options.canSkipValidation = () => this.options.canSkipValidation

    if (!is(this.options.canSkipValidation, Function))
      throw new Error('Schema options.canSkipValidation is expected to be a boolean or a predicate function.')

    //Create definitions
  }

  paths = []

  applyHook = sanitizeAndValidate(this)

  async sanitize(data = {}, params = {}) {

    //use a new object for the returned data, rather than mutating the provided one
    //this ensures that no data will be passed that isn't defined in the schema
    const sanitized = {}

    for (const path of this.paths) {
      //for each path in the schema, get the equivalent value in the hook data,
      //consolidating empty or undefined values to null
      let value = getIn(data, path)
      if (value === undefined || value === '')
        value = null

      const { sanitizers } = getIn(this, path)
      for (const sanitizer of sanitizers)
        //run the value through all of the sanitizers in this path
        value = await sanitizer(value, params)

      setIn(sanitized, path, value)
    }

    return sanitized
  }

  async validate(data = {}, params = {}) {

    let errors = null

    for (const path of this.paths) {
      //for each path in the schema get the equivalent value in the data
      const value = getIn(data, path)

      const { validators } = getIn(this, path)
      for (const validator of validators) {

        //run the value against every validator in this path
        const result = await validator(value, params)

        //falsy results mean validation passed
        if (!result)
          continue

        //if we've gotten here, it means a validator has failed. First we ensure
        //the errors variable is casted to an object, then we set the validator
        //results inside of it
        errors = errors || {}
        setIn(errors, path, result)
      }
    }

    return errors
  }

}
