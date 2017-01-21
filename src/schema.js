import { isPlainObject, array } from './helper'
import { populateWithSchema, sanitizeWithSchema, validateWithSchema } from './hooks'

import * as sanitizers  from './sanitizers'
import * as validators from './validators'

import { ALL, ANY, cast } from './types'
import is from 'is-explicit'

/******************************************************************************/
// Helpers
/******************************************************************************/

const fixKey = key => key.replace(/_|@/g, '')

//Quick helper function to
const fixKeys = obj => Object
  .keys(obj)
  .map(fixKey)

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

  addProperty(definition, key) {

    if (!isPlainObject(this.properties))
      this.properties = {}

    if (key in this.properties)
      throw new Error('Property already exists.')

    this.properties[key] = new Property(definition, key)

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

  constructor(definition, path) {
    super()

    //Determin Path
    this.path = array(path)

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

    this.properties[key].path = [...this.path, key]
  }

  async sanitize(input, params) {

    input = array(input)

    let output = this.array ? [] : null

    for (let value of input) {

      //ensure the value is the type of this property
      value = cast(value, this.type)

      //if this property has sub properties, and the value survived casting, it
      //must be an object, so we only need to check if it's null or not.
      //Then sanitize each of the values sub properties.
      if (value !== null && this.properties) {

        //We create a seperate object for the sanitized data, so that
        //this method doesn't return an object with any properties that
        //arn't defined by it's sub-properties
        const sanitized = {}

        for(const key in this.properties) {
          const property = this.properties[key]
          sanitized[key] = await property.sanitize(value[key], params)
        }

        value = sanitized
      }

      //then we sanitize the value as a whole
      for (const sanitizer of this.sanitizers)
        value = await sanitizer(value, params)

      //if this property isn't an array, we don't need to continue. If the input
      //value was an array, this property will only take the first value.
      if (!this.array) {
        output = value
        break
      }

      //if we've gotten here, output will definetly be an array. We also only
      //need to push values if they're not null
      if (is(value))
        output.push(value)

    }

    return output
  }

  async validate(values, params) {

    const isArray = is(values, Array)
    const any = this.type === ANY

    //validate array first
    if (this.array && !isArray && !any)
      return this.type ? `Expected array of ${this.type.name}.` : 'Expected array.'

    else if (!this.array && isArray && !any)
      return `Expected single ${this.type.name}.`

    //after all that, cast it to an Array anyway
    values = isArray ? values : [values]

    const errors = []

    for (let i = 0; i < values.length; i++) {

      const value = values[i]
      const isNull = !is(value)

      let result = do {

        //Symbols, typed or not, cannot be stored in a Database
        if (is(value, Symbol))
          'Cannot store a Symbol as a value.'

        //Neither can functions
        else if (is(value, Function))
          'Cannot store a Function as a value.'

        //Nor should NaN
        else if (Number.isNaN(value))
          'Cannot store NaN as a value.'

        //values of type Object should only apply for plain objects
        else if (this.type === Object && !isNull && !isPlainObject(value))
          'Expected plain Object.'

        //A typed value can equal null, meaning that it is optional. If a value
        //isn't null, and isn't of the type specified, it shouldn't pass validation
        else if (!any && !isNull && !is(value, this.type))
          `Expected ${this.array ? 'array of ' : ''}${this.type.name}.`

        //All remaining values either fit their type or are elligable for 'ANY'
        else
          false

      }

      //validate each property on the value
      if (!result && this.properties) {

        for(const key in this.properties) {
          const property = this.properties[key]
          const propResult = await property.validate(value[key], params)

          //if propResult is falsy, then it passed validation
          if (!propResult)
            continue

          //ensure result is an object before filling the errors of this values
          //sub properties
          result = result || {}
          result[key] = propResult

        }
      }

      //if there are still no errors, we validate this property as a whole
      if (!result) {
        for (const validator of this.validators) {
          result = await validator(value, params)

          //if a validator failed, we don't need to continue
          if (result)
            break
        }
      }

      //if this property isn't an array, we don't need to continue.
      if (!this.array)
        return result

      //else we assign the result for this index, even if the result is false, and
      //the validation passed.
      else
        errors[i] = result

    }

    //array validation is finished. If the values passed validation we'll have
    //an array full of 'false', so we need to check to ensure there actually was
    //an error to send back
    for (const result of errors)
      if (result)
        return errors

    //if we've gotten here, validation is a complete pass
    return false

  }

  type = null

  array = false

  path = null

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

  async sanitize(data, params = {}) {

    if (!isPlainObject(data))
      throw new Error('sanitize expects a plain object as data for its first argument.')

    if (!isPlainObject(params))
      throw new Error('if provided, sanitize\'s second argument must be a plain object to be used as sanitize parameters.')

    const sanitized = {}

    for (const key in this.properties) {

      if (key in data === false)
        continue

      const property = this.properties[key]
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

    for (const key in this.properties) {

      const property = this.properties[key]

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

    populate: null,

    sanitize: null,

    validate: null,

    *[Symbol.iterator]() {
      for (const key in this)
        yield this[key]
    }

  }

}
