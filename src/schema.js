import { array } from './helper'
import { populateWithSchema, sanitizeWithSchema, validateWithSchema } from './hooks'

import * as sanitizers from './sanitizers'
import * as validators from './validators'

import { ALL, DEFAULT, ANY, cast, check, name } from './types'
import is from 'is-explicit'

/******************************************************************************/
// Helpers
/******************************************************************************/

const fixKeyUnderscore = key => key.replace(/_/g, '')
const fixKeyAtSymbol = key => key.replace(/@/g, '')

const fixKeysUnderscore = obj => Object
  .keys(obj)
  .map(fixKeyUnderscore)

const spreadable = {
  * [Symbol.iterator] () {
    for (const key in this)
      yield this[key]
  }
}

/******************************************************************************/
// Constants and Symbols
/******************************************************************************/

const DEFAULT_OPTIONS = {
  populateOnPatch: false,
  canSkipValidation: () => false
}

const RESERVED_PROPERTY_KEYS = Object.freeze([
  'type', 'validates', 'validate', 'sanitize', 'sanitizes',
  ...fixKeysUnderscore(sanitizers),
  ...fixKeysUnderscore(validators)
])

const DEFINITION = Symbol('definition')
const PARENT = Symbol('parent')

/******************************************************************************/
// PropertyBase
/******************************************************************************/

class PropertyBase {

  addProperty (input, key, Type = this.constructor) {

    if (!is.plainObject(this.properties))
      this.properties = { ...spreadable }

    if (key in this.properties)
      throw new Error(`Property already exists: ${key}`)

    const parent = is(this, Schema) ? null : this

    const property = this.properties[key] = new Type(input, key, parent)

    return property

  }

  properties = null

}

/******************************************************************************/
// Property Class Private Danglers
/******************************************************************************/

function addCustom (defs, key, arr) {

  if (key in defs === false)
    return

  const def = defs[key]
  const factories = array(def)

  for (const factory of factories)
    try {

      const func = factory.call(this, def)

      if (!is(func, Function))
        throw new Error('Custom Validators must be a higher-order function that returns the validator function.')

      arr.push(func)

    } catch (err) {

      err.message = `Adding custom validator failed: ${err.message}`
      throw err

    }

}

function addStock (def, stock, arr) {
  for (const stockkey in stock) {

    // remove underscores from stock keys, such as in _default
    const key = fixKeyUnderscore(stockkey)

    if (key in def) {
      const factory = stock[stockkey]
      const func = factory.call(this, def[key])
      arr.push(func)
    }
  }
}

function copyDefinition (definition) {

  if (!is.plainObject(definition))
    return definition

  const copy = { }

  for (const key in definition) {
    const value = definition[key]

    copy[key] = is(value, Array)
      ? value.map(v => copyDefinition(v))

      : copyDefinition(value)
  }

  return copy
}

function applyDefinition (definition) {

  // we store the definition property so that it can be used when composing schemas
  this[DEFINITION] = array(definition, this.array)

  // Why copy a definition?
  // If a schema is nested, it's properties will be rebuilt into the parent
  // schema using their definitions. It's possible for sanitizers or validators
  // to mutate the definition in the process of creating methods, so to ensure
  // we dont damage the definition for future schemas to use when nesting, we
  // create a copy for the s&vs to play with.
  const mutableDefinition = copyDefinition(definition)

  addStock.call(this, mutableDefinition, validators, this.validators)
  addCustom.call(this, mutableDefinition, 'validates', this.validators)
  addCustom.call(this, mutableDefinition, 'validate', this.validators)

  // get stock and custom sanitizer
  addStock.call(this, mutableDefinition, sanitizers, this.sanitizers)
  addCustom.call(this, mutableDefinition, 'sanitizes', this.sanitizers)
  addCustom.call(this, mutableDefinition, 'sanitize', this.sanitizers)

  // Determin sub properties
  const subProperties = { }

  for (const key in mutableDefinition)
    if (!RESERVED_PROPERTY_KEYS.includes(key))
      subProperties[key] = mutableDefinition[key]

  if (Object.keys(subProperties).length === 0)
    return

  for (const key in subProperties)
    // the fixKeyAtSymbol() is important here, because it allows the use of reserved property
    // keys as property names. eg: { '@type': "value" } becomes { type: "value"}
    this.addProperty(subProperties[key], fixKeyAtSymbol(key))

}

function applyNestedProperties (input) {

  if (is(input, Property)) {
    this.type = input.type
    applyDefinition.call(this, array.unwrap(input[DEFINITION]), this.key)

  } else if (input.properties) {
    this.type = Object
    this[DEFINITION] = input

    for (const property of input.properties)
      this.addProperty(property[DEFINITION], property.key)

  } else throw new Error('Problem applying nested properties.')

}

/******************************************************************************/
// Property Class
/******************************************************************************/

export class Property extends PropertyBase {

  // the constructor of a property parses the input for that property
  constructor (input, key, parent = null) {
    super()

    if (parent !== null && !is(parent, PropertyBase))
      throw new Error('parent must be either a Schema or a Property.')

    this.key = key
    this[PARENT] = parent

    // Determine if array
    this.array = is(input, Array)
    // if an empty array was supplied, the rest of the definition is pretty simple
    if (this.array && input.length === 0)
      input = { type: ANY }

    else if (this.array && input.length > 1)
      throw new Error('Malformed property: Properties defined as Arrays should only contain a single element.')

    else if (this.array)
      input = input[0]

    // Determin type
    // schemas and properties should be composable
    if (is(input, PropertyBase))
      return applyNestedProperties.call(this, input)

    else if (ALL.includes(input))
      input = { type: input }

    if (!is.plainObject(input))
      throw new Error('Malformed property: Could not convert to Type notation.')

    // try to get type from shortcut type notation, eg:
    // property: { String } insteadof property: { type: String }
    if ('type' in input === false) for (const type of DEFAULT) {
      const key = name(type)

      const hasShortCut = key in input && input[key] === type
      if (!hasShortCut)
        continue

      // if we've gotten here, there are multiple shortcut properties eg:
      // property: { String, Number, ANY }
      if (input.type || input.type === ANY)
        throw new Error(`Multiple types defined: ${name(input.type)}`)

      input.type = type
      delete input[key]
    }

    // if we've gotten here, but still dont have a type defined, then it must be an
    // object.
    if ('type' in input === false)
      input.type = Object

    this.type = input.type
    if (!ALL.includes(this.type))
      throw new Error(`Malformed property: ${this.type} is not a valid type.`)

    applyDefinition.call(this, input)
  }

  addProperty (input, key) {
    if (this.type !== Object)
      throw new Error('Cannot nest properties inside of a property that isn\'t a plain object.')

    return super.addProperty(input, key)

  }

  async sanitize (input, params) {

    let values = cast(input, this.type, this.array)

    // run all the sanitizers on this property
    for (const sanitizer of this.sanitizers)
      values = await sanitizer(values, params)

    // if sanitization returned a null value, we don't need to continue
    if (!is(values))
      return values

    values = array(values)

    // run the sanitiers for sub properties, if there are any
    if (this.properties) for (let i = 0; i < values.length; i++) {
      const value = values[i]

      // dont validate sub properties if value isn't a plain object,
      if (!is.plainObject(value))
        continue

      // We create a seperate object for the sanitized data, so that
      // this method doesn't return an object with any properties that
      // arn't defined by it's sub-properties
      const sanitized = {}

      for (const property of this.properties) {
        const { key } = property

        sanitized[key] = await property.sanitize(value[key], params)
      }

      values[i] = sanitized
    }

    // only return an array if this is an array property
    return array.unwrap(values, !this.array)
  }

  async validate (value, params) {

    let results = check(value, this.type, this.array)
    if (results)
      return results

    // if we passed type checking, we run each of the validators on the value
    for (const validator of this.validators) {
      results = await validator(value, params)

      // if the validator failed, we don't need to continue
      if (results)
        return results
    }

    // if we've gotten here, there are no sub properties, or the object wasn't
    // initialized. As such, sub properties don't need to be validated if they don't exist.
    if (!this.properties || value === null)
      return results

    const values = array(value)

    results = array(results)

    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      let result = false

      for (const property of this.properties) {
        const { key } = property

        const keyResult = await property.validate(value[key], params)
        if (!keyResult)
          continue

        // ensure result is an object before filling the errors of this values
        // sub properties
        result = result || {}
        result[key] = keyResult

      }

      results[i] = result
    }

    return this.array

      // if this is an array value, we only send back an array of results if any of the
      // results are truthy; truthy == fail
      ? results.some(result => result) ? results : false

      // otherwise the first result in results will be the result of the singular type check
      : results[0]

  }

  type = null

  array = false

  sanitizers = []

  validators = []

  get parent () { return this[PARENT] }

  get definition () { return this[DEFINITION] }

  [PARENT] = null

}

/******************************************************************************/
// Schema class
/******************************************************************************/

export default class Schema extends PropertyBase {

  constructor (inputs, options) {
    super()

    // Check options
    if (is(options) && !is.plainObject(options))
      throw new Error('options, if supplied, are expected to be a plain object.')

    this.options = { ...DEFAULT_OPTIONS, ...(options || {}) }

    if (is(this.options.canSkipValidation, Boolean)) {
      const canSkip = this.options.canSkipValidation
      this.options.canSkipValidation = () => canSkip
    }

    if (!is(this.options.canSkipValidation, Function))
      throw new Error('Schema options.canSkipValidation is expected to be a boolean or a predicate function.')

    // Create properties
    if (!is.plainObject(inputs))
      throw new Error('A schema must be created with a plain inputs object.')

    for (const key in inputs)
      // the fixKeyAtSymbol() is important here, because it allows the use of reserved property
      // keys as property names. eg: { '@type': "value" } becomes { type: "value"}
      this.addProperty(inputs[key], fixKeyAtSymbol(key))

    if (this.properties === null)
      throw new Error('Schema was created with no properties.')

    // Build Hooks
    this.hooks.populate = populateWithSchema(this)
    this.hooks.validate = validateWithSchema(this)
    this.hooks.sanitize = sanitizeWithSchema(this)

  }

  addProperty (input, key) {
    super.addProperty(input, key, Property)
  }

  async sanitize (data, params = {}) {

    if (!is.plainObject(data))
      throw new Error('sanitize expects a plain object as data for its first argument.')

    if (!is.plainObject(params))
      throw new Error('if provided, sanitize\'s second argument must be a plain object to be used as sanitize parameters.')

    // the params object should always have the entirety of the data being sanitized.
    // this way it can be used by custom sanitize methods weather the schema is
    // being used client or server-side
    params.data = data

    const sanitized = {}

    for (const property of this.properties) {

      const { key } = property

      sanitized[key] = await property.sanitize(data[key], params)

    }

    return sanitized

  }

  async validate (data, params = {}) {

    if (!is.plainObject(data))
      throw new Error('validate expects a plain object as data for its first argument.')

    if (!is.plainObject(params))
      throw new Error('if provided, validate\'s second argument must be a plain object to be used as validate parameters.')

    let errors = false

    // the params object should always have the entirety of the data being validated.
    // this way it can be used by custom validate methods weather the schema is
    // being used client or server-side
    params.data = data

    for (const property of this.properties) {

      const { key } = property

      const result = await property.validate(data[key], params)

      // falsy results mean validation passed
      if (!result)
        continue

      // if we've gotten here, it means a validator has failed. First we ensure
      // the errors variable is casted to an object, then we set the validator
      // results inside of it
      errors = errors || {}
      errors[key] = result
    }

    return errors

  }

  hooks = {

    ...spreadable,

    populate: null,

    sanitize: null,

    validate: null

  }

}

/******************************************************************************/
// Other Exports
/******************************************************************************/

export { RESERVED_PROPERTY_KEYS }
