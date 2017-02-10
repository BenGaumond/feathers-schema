import { isPlainObject, array } from './helper'
import { populateWithSchema, sanitizeWithSchema, validateWithSchema } from './hooks'

import * as sanitizers  from './sanitizers'
import * as validators from './validators'

import { ALL, ANY, cast, check } from './types'
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
  *[Symbol.iterator]() {
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

  addProperty(definition, key, Type = this.constructor) {

    if (!isPlainObject(this.properties))
      this.properties = { ...spreadable }

    if (key in this.properties)
      throw new Error(`Property already exists: ${key}`)

    const parent = is(this, Schema) ? null : this

    return this.properties[key] = new Type(definition, key, parent)

  }

  properties = null

}

/******************************************************************************/
// Property Class Private Danglers
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

      err.message = `Adding custom validator failed: ${err.message}`
      throw err

    }
  }
}

function addStock(def, stock, arr) {
  for (const stockkey in stock) {

    //remove underscores from stock keys, such as in _default
    const key = fixKeyUnderscore(stockkey)

    if (key in def) {
      const factory = stock[stockkey]
      const func = factory.call(this, def[key])
      arr.push(func)
    }
  }
}

//Why copy a definition?
//If a schema is nested, it's properties will be rebuilt into the parent
//schema using their definitions. It's important
function copyDefinition(definition) {

  if (!isPlainObject(definition))
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

function applyDefinition(definition) {

  this[DEFINITION] = definition

  const mutableDefinition = copyDefinition(definition)

  addStock.call(this, mutableDefinition, validators, this.validators)
  addCustom.call(this, mutableDefinition, 'validates', this.validators)
  addCustom.call(this, mutableDefinition, 'validate', this.validators)

  //get stock and custom sanitizer
  addStock.call(this, mutableDefinition, sanitizers, this.sanitizers)
  addCustom.call(this, mutableDefinition, 'sanitizes', this.sanitizers)
  addCustom.call(this, mutableDefinition, 'sanitize', this.sanitizers)

  //Determin sub properties
  const subProperties = { }

  for (const key in mutableDefinition)
    if (!RESERVED_PROPERTY_KEYS.includes(key))
      subProperties[key] = mutableDefinition[key]

  if (Object.keys(subProperties).length === 0)
    return

  for (const key in subProperties)
    //the fixKeyAtSymbol() is important here, because it allows the use of reserved property
    //keys as property names. eg: { '@type': "value" } becomes { type: "value"}
    this.addProperty(subProperties[key], fixKeyAtSymbol(key))

  //we store the definition property so that it can be used when composing schemas
}

function applyNestedSchema(schema) {

  this.type = Object
  this[DEFINITION] = schema

  for(const property of schema.properties)
    this.addProperty(property[DEFINITION], property.key)

}

/******************************************************************************/
// Property Class
/******************************************************************************/

class Property extends PropertyBase {

  // the constructor of a property parses the definition for that property
  constructor(definition, key, parent) {
    super()

    this.key = key
    this[PARENT] = parent

    //Determine if array
    this.array = is(definition, Array)
    if (this.array && definition.length === 0)
      definition = { type: ANY }

    else if (this.array && definition.length > 1)
      throw new Error('Malformed property: Properties defined as Arrays should only contain a single element.')

    else if (this.array)
      definition = definition[0]

    //Determin type
    //schemas should be composable
    if (is(definition, Schema))
      return applyNestedSchema.call(this, definition)

    else if (ALL.includes(definition))
      definition = { type: definition }

    //pass empty Object in as Object type
    else if (isPlainObject(definition) && 'type' in definition === false)
      definition = { type: Object, ...definition }

    if (!isPlainObject(definition))
      throw new Error('Malformed property: Could not convert to Type notation.')

    this.type = definition.type || ANY
    if (!ALL.includes(this.type))
      throw new Error(`Malformed property: ${this.type} is not a valid type.`)

    applyDefinition.call(this, definition)
  }

  addProperty(definition, key) {
    if (this.type !== Object)
      throw new Error('Cannot nest properties inside of a property that isn\'t a plain object.')

    return super.addProperty(definition, key)

  }

  async sanitize(input, params) {

    let values = cast(input, this.type, this.array)

    //run all the sanitizers on this property
    for (const sanitizer of this.sanitizers)
      values = await sanitizer(values, params)

    //if sanitization returned a null value, we don't need to continue
    if (!is(values))
      return values

    values = array(values)

    //run the sanitiers for sub properties, if there are any
    if (this.properties) for (let i = 0; i < values.length; i++) {
      const value = values[i]

      // dont validate sub properties if value isn't a plain object,
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

    //only return an array if this is an array property
    return array.unwrap(values, !this.array)
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

      results[i] = result
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

  get parent() {
    return this[PARENT]
  }

  [PARENT] = null

}

/******************************************************************************/
// Export Schema
/******************************************************************************/

export { RESERVED_PROPERTY_KEYS }

export default class Schema extends PropertyBase {

  constructor(definitions, options) {
    super()

    //Check options
    if (is(options) && !isPlainObject(options))
      throw new Error('options, if supplied, are expected to be a plain object.')

    this.options = { ...DEFAULT_OPTIONS, ...(options || {})}

    if (is(this.options.canSkipValidation, Boolean)) {
      const canSkip = this.options.canSkipValidation
      this.options.canSkipValidation = () => canSkip
    }

    if (!is(this.options.canSkipValidation, Function))
      throw new Error('Schema options.canSkipValidation is expected to be a boolean or a predicate function.')

    //Create properties
    if (!isPlainObject(definitions))
      throw new Error('A schema must be created with a plain definitions object.')

    for (const key in definitions)
      //the fixKeyAtSymbol() is important here, because it allows the use of reserved property
      //keys as property names. eg: { '@type': "value" } becomes { type: "value"}
      this.addProperty(definitions[key], fixKeyAtSymbol(key))

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

    //the params object should always have the entirety of the data being sanitized.
    //this way it can be used by custom sanitize methods weather the schema is
    //being used client or server-side
    params.data = data

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

    //the params object should always have the entirety of the data being validated.
    //this way it can be used by custom validate methods weather the schema is
    //being used client or server-side
    params.data = data

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
