import { isPlainObject, array } from './helper'
import { populateWithSchema, sanitizeWithSchema, validateWithSchema } from './hooks'

import * as sanitizers  from './sanitizers'
import * as validators from './validators'

import { ALL, ANY, cast, check } from './types'
import is from 'is-explicit'

/******************************************************************************/
// Helpers
/******************************************************************************/

const fixKey = key => key.replace(/_|@/g, '')

const fixKeys = obj => Object
  .keys(obj)
  .map(fixKey)

const spreadable = {
  *[Symbol.iterator]() {
    for (const key in this)
      yield this[key]
  }
}

/******************************************************************************/
// Data
/******************************************************************************/

const DEFAULT_OPTIONS = {
  populateOnPatch: false,
  canSkipValidation: () => false
}

const RESERVED_PROPERTY_KEYS = [
  'type', 'validates', 'validate', 'sanitize', 'sanitizes',
  ...fixKeys(sanitizers),
  ...fixKeys(validators)
]

/******************************************************************************/
// PropertyBase
/******************************************************************************/

class PropertyBase {

  addProperty(definition, key, Type = this.constructor) {

    if (!isPlainObject(this.properties))
      this.properties = {
        ...spreadable
      }

    if (key in this.properties)
      throw new Error('Property already exists.')

    this.properties[key] = new Type(definition, key)

  }

  properties = null

}

/******************************************************************************/
// Property Class
/******************************************************************************/

function addCustom(defs, key, arr) {

  if (key in defs === false)
    return

  const def = defs[key]

  const factories = array(def)
  for (const factory of factories) {
    try {
      const result = factory.call(this, def)

      //TODO this doesn't work. Factories may well throw valid errors in the event
      //of a type mismatch, or something.

      //We're expecting custom validators to be a function factory.
      //However, if they don't return a function, we'll assume that the
      //factory is actually the custom validator, and not it's result.
      const func = is(result, Function) ? result : factory

      arr.push(func)

    } catch (err) {

      //if the factory call fails for any reason, we'll also assume it's a custom validator
      arr.push(factory)
    }
  }
}

function addStock(def, stock, arr) {
  for (const stockkey in stock) {

    //remove underscores from stock keys, such as in _default
    const key = fixKey(stockkey)

    if (key in def) {
      const factory = stock[stockkey]
      const func = factory.call(this, def[key])
      arr.push(func)
    }
  }
}

class Property extends PropertyBase {

  constructor(definition, key) {
    super()

    this.key = key

    //Determine if array
    this.array = is(definition, Array)
    if (this.array && definition.length === 0)
      definition = { type: ANY }

    else if (this.array && definition.length > 1)
      throw new Error('Malformed property: Properties defined as Arrays should only contain a single element.')

    else if (this.array)
      definition = definition[0]

    //Determin type
    if (ALL.includes(definition))
      definition = { type: definition }

    //pass empty Object in as Object type
    else if (isPlainObject(definition) && 'type' in definition === false)
      definition = { type: Object, ...definition }

    if (!isPlainObject(definition))
      throw new Error('Malformed property: Could not convert to Type notation.')

    this.type = definition.type || ANY
    if (!ALL.includes(this.type))
      throw new Error(`Malformed property: ${this.type} is not a valid type.`)

    //get stock and custom validators
    addStock.call(this, definition, validators, this.validators)
    addCustom.call(this, definition, 'validates', this.validators)
    addCustom.call(this, definition, 'validate', this.validators)

    //get stock and custom sanitizer
    addStock.call(this, definition, sanitizers, this.sanitizers)
    addCustom.call(this, definition, 'sanitizes', this.sanitizers)
    addCustom.call(this, definition, 'sanitize', this.sanitizers)

    //Determin sub properties
    RESERVED_PROPERTY_KEYS.forEach(key => delete definition[key])

    const hasSubProperties = Object.keys(definition).length > 0
    if (!hasSubProperties)
      return

    for (const key in definition)
      this.addProperty(definition[key], fixKey(key))

  }

  addProperty(definition, key) {
    if (this.type !== Object)
      throw new Error('Cannot nest properties inside of a property that isn\'t a plain object.')

    super.addProperty(definition, key)

  }

  async sanitize(input, params) {

    let values = cast(input, this.type, this.array)

    //then we sanitize the value as a whole
    for (const sanitizer of this.sanitizers)
      values = await sanitizer(values, params)

    if (!this.properties)
      return values

    values = array(values)

    for (let i = 0; i < values.length; i++) {
      const value = values[i]

      //if the sanitizers array returned a value that isn't a plain object
      if (!isPlainObject(value))
        continue

      //We create a seperate object for the sanitized data, so that
      //this method doesn't return an object with any properties that
      //arn't defined by it's sub-properties
      const sanitized = {}

      for (const property of this.properties) {
        const { key } = property

        sanitized[key] = await property.sanitize(value[key], params)
      }

      values[i] = sanitized
    }

    return is.array ? values : values[0]
  }

  async validate(value, params) {

    let results = check(value, this.type, this.array)
    if (results)
      return results

    //if we passed type checking, we run each of the validators on the value
    for (const validator of this.validators) {
      results = await validator(value, params)

      //if the validator failed, we don't need to continue
      if (results)
        return results
    }

    //if there are no sub properties, we don't need to continue
    if (!this.properties)
      return results

    const values = array(value)

    results = array(results)

    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      let result = false

      for (const property of this.properties) {
        const { key } = property

        //we don't need to check if value is an object, because it's only possible
        //to get here if it is one
        const keyResult = await property.validate(value[key], params)
        if (!keyResult)
          continue

        //ensure result is an object before filling the errors of this values
        //sub properties
        result = result || {}
        result[key] = keyResult

      }

      result[i] = result
    }

    return this.array

      //if this is an array value, we only send back an array of results if any of the results are truthy
      ? results.some(result => result) ? results : false

      //otherwise the first result in results will be the result of the singular type check
      : results[0]

  }

  type = null

  array = false

  sanitizers = []

  validators = []

}

/******************************************************************************/
// Export Schema
/******************************************************************************/

export default class Schema extends PropertyBase {

  constructor(definitions, options) {
    super()

    //Check options
    if (is(options) && !isPlainObject(options))
      throw new Error('options, if supplied, is expected to be a plain object.')

    this.options = { ...DEFAULT_OPTIONS, ...(options || {})}

    if (is(this.options.canSkipValidation, Boolean))
      this.options.canSkipValidation = () => this.options.canSkipValidation

    if (!is(this.options.canSkipValidation, Function))
      throw new Error('Schema options.canSkipValidation is expected to be a boolean or a predicate function.')

    //Create properties
    if (!isPlainObject(definitions))
      throw new Error('A schema must be created with a plain definitions object.')

    for (const key in definitions)
      this.addProperty(definitions[key], fixKey(key))

    if (this.properties === null)
      throw new Error('Schema was created with no properties.')

    //Build Hooks
    this.hooks.populate = populateWithSchema(this)
    this.hooks.validate = validateWithSchema(this)
    this.hooks.sanitize = sanitizeWithSchema(this)

  }

  addProperty(definition, key) {
    super.addProperty(definition, key, Property)
  }

  async sanitize(data, params = {}) {

    if (!isPlainObject(data))
      throw new Error('sanitize expects a plain object as data for its first argument.')

    if (!isPlainObject(params))
      throw new Error('if provided, sanitize\'s second argument must be a plain object to be used as sanitize parameters.')

    const sanitized = {}

    for (const property of this.properties) {
      const { key } = property

      if (key in data === false)
        continue

      const value = await property.sanitize(data[key], params)
      sanitized[key] = value
    }

    return sanitized

  }

  async validate(data, params = {}) {

    if (!isPlainObject(data))
      throw new Error('validate expects a plain object as data for its first argument.')

    if (!isPlainObject(params))
      throw new Error('if provided, validate\'s second argument must be a plain object to be used as validate parameters.')

    let errors = false

    for (const property of this.properties) {
      const { key } = property

      const result = await property.validate(data[key], params)

      //falsy results mean validation passed
      if (!result)
        continue

      //if we've gotten here, it means a validator has failed. First we ensure
      //the errors variable is casted to an object, then we set the validator
      //results inside of it
      errors = errors || {}
      errors[key] = result
    }

    return errors

  }

  hooks = {

    ...spreadable,

    populate: null,

    sanitize: null,

    validate: null,

  }

}
