import { toArray, fromArray } from './helper'
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

class MalformedPropertyError extends Error {
  constructor (key, msg) {
    super((key ? `On property '${key}': ` : '') + msg)
    this.name = 'MalformedPropertyError'
  }
}

/******************************************************************************/
// Constants and Symbols
/******************************************************************************/

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

function addCustomValidatorOrSanitizer (defs, key, arrKey) {

  if (key in defs === false)
    return

  const errTypeName = arrKey.replace(/s$/, '')
  const arr = this[arrKey]

  const def = defs[key]
  const factories = def::toArray()

  for (const factory of factories)
    try {

      const func = this::factory(def)

      if (!is(func, Function))
        throw new Error(`Custom ${arrKey} must be a higher-order function that returns the ${errTypeName} function.`)

      arr.push(func)

    } catch (err) {

      const name = factory.name || 'custom'

      err.message = `Adding '${name}' ${errTypeName} on '${this.key}' property failed: ${err.message}`
      throw err

    }

}

function addStockValidatorOrSanitizer (def, stock, arrKey) {

  const errTypeName = arrKey.replace(/s$/, '')
  const arr = this[arrKey]

  for (const stockkey in stock) {

    // remove underscores from stock keys, such as in _default
    const key = fixKeyUnderscore(stockkey)

    if (key in def) {
      const factory = stock[stockkey]

      try {
        const func = this::factory(def[key])
        arr.push(func)

      } catch (err) {

        err.message = `Adding '${factory.name}' ${errTypeName} on '${this.key}' property failed: ${err.message}`
        throw err
      }

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
  this[DEFINITION] = this.array ? definition::toArray() : definition

  // Why copy a definition?
  // If a schema is nested, it's properties will be rebuilt into the parent
  // schema using their definitions. It's possible for sanitizers or validators
  // to mutate the definition in the process of creating methods, so to ensure
  // we dont damage the definition for future schemas to use when nesting, we
  // create a copy for the s&vs to play with.
  const mutableDefinition = copyDefinition(definition)

  this::addStockValidatorOrSanitizer(mutableDefinition, validators, 'validators')
  this::addCustomValidatorOrSanitizer(mutableDefinition, 'validates', 'validators')
  this::addCustomValidatorOrSanitizer(mutableDefinition, 'validate', 'validators')

  // get stock and custom sanitizer
  this::addStockValidatorOrSanitizer(mutableDefinition, sanitizers, 'sanitizers')
  this::addCustomValidatorOrSanitizer(mutableDefinition, 'sanitizes', 'sanitizers')
  this::addCustomValidatorOrSanitizer(mutableDefinition, 'sanitize', 'sanitizers')

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
    this::applyDefinition(input[DEFINITION]::fromArray(), this.key)

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

    const altArrayTypeDefined = is.plainObject(input) && is(input.type, Array)
    if (altArrayTypeDefined && this.array)
      throw new MalformedPropertyError(this.key, 'Either the definition can be wrapped in an Array or the type, not both.')

    // if an empty array was supplied, the rest of the definition is pretty simple
    if (this.array && input.length === 0)
      input = { type: ANY }

    else if ((this.array && input.length > 1) || (altArrayTypeDefined && input.type.length > 1))
      throw new MalformedPropertyError(this.key, 'Properties defined as Arrays should only contain a single element.')

    else if (this.array)
      input = input[0]

    else if (altArrayTypeDefined) {
      const { type, ...other } = input
      this.array = true
      input = { type: type[0], ...other }
    }

    // Determin type
    // schemas and properties should be composable
    if (is(input, PropertyBase))
      return this::applyNestedProperties(input)

    else if (ALL.includes(input))
      input = { type: input }

    if (!is.plainObject(input))
      throw new MalformedPropertyError(this.key, 'Could not convert to Type notation.')

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
        throw new MalformedPropertyError(this.key, `Multiple types defined; ${name(input.type)}`)

      input.type = type
      delete input[key]
    }

    // if we've gotten here, but still dont have a type defined, then it must be an
    // object.
    if ('type' in input === false)
      input.type = Object

    this.type = input.type
    if (!ALL.includes(this.type))
      throw new MalformedPropertyError(this.key, `${name(this.type)} is not a valid type.`)

    this::applyDefinition(input)
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
    if (!is.defined(values))
      return values

    values = values::toArray()

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
    return this.array
      ? values
      : values::fromArray()
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

    const values = value::toArray()

    results = results::toArray()

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

  constructor (inputs) {
    super()

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
