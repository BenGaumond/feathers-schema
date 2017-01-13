import { getIn, setIn, isPlainObject } from './helper'

import * as sanitizers  from './sanitizers'
import * as validators from './validators'

import TYPES from './types'
import is from 'is-explicit'

/******************************************************************************/
// Data
/******************************************************************************/

const DEFAULT_OPTIONS = {

}

const RESERVED_PROPERTY_KEYS = [
  'type', 'validates', 'validate', 'sanitize', 'sanitizes',
  ...Object.keys(sanitizers),
  ...Object.keys(validators)
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

  const factories = is(def, Array) ? def : [def]
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
  for (const key in stock)
    if (key in def) {
      const factory = stock[key]
      const func = factory.call(this, def[key])
      arr.push(func)
    }
}


class Property extends PropertyBase {

  constructor(definition, path) {
    super()

    //Determin Path
    this.path = is(path, Array) ? path : [path]

    //parse Array Propery
    this.array = is(definition, Array)
    if (this.array && definition.length === 0)
      definition = { type: Object }

    else if (this.array && definition.length > 1)
      throw new Error('Malformed property. Properties defined as Arrays should only contain a single element.')

    else if (this.array)
      definition = definition[0]

    //Determin type
    if (TYPES.includes(definition))
      definition = { type: definition }

    if (is(definition, Function))
      throw new Error('Unsupported type.')

    if (!isPlainObject(definition))
      throw new Error('Malformed property.')

    this.type = definition.type || Object

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
      this.addProperty(definition[key], key)

  }

  addProperty(definition, key) {
    if (this.type !== Object)
      throw new Error('Cannot nest properties inside of a property that isn\'t a plain object.')

    super.addProperty(definition, key)

    this.properties[key].path = [...this.path, key]
  }

  async sanitize(input, params) {

    input = is(input, Array) ? input : [input]

    const output = []

    for (let i = 0; i < input.length; i++) {
      let value = input[i]

      //if this property has nested properties, sanitize them first
      if (this.properties) {
        const sanitized = {}

        for(const key in this.properties) {
          const property = this.properties[key]
          sanitized[key] = await property.sanitize(value[key], params)
        }

        value = sanitized
      }

      //then we sanitize the root
      for (const sanitizer of this.sanitizers)
        value = await sanitizer(value, params)

      //if this isn't an array, we don't need to continue
      if (!this.array)
        return value

      //if it is, we only need to keep values that arn't null or undefined
      else if (is(value))
        output.push(value)
    }

    return output

  }

  async validate(value) {

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

    //Create properties
    if (!isPlainObject(definitions))
      throw new Error('A schema must be created with a plain definitions object.')

    //Check options
    if (is(options) && !isPlainObject(options))
      throw new Error('options, if supplied, is expected to be a plain object.')

    this.options = { ...DEFAULT_OPTIONS, ...(options || {})}

    for (const key in definitions)
      this.addProperty(definitions[key], key)

  }

  async sanitize(data = {}, params = {}) {

    if (!isPlainObject(data))
      throw new Error('Malformed sanitize call.')

    const sanitized = {}

    for (const key in this.properties) {

      if (key in data === false)
        continue

      const prop = this.properties[key]
      const value = await prop.sanitize(data[key], params, sanitized)

      sanitized[key] = value
    }

    return sanitized

  }

  async validate(data = {}, params = {}) {

  }

  async sanitizeAndValidate(data = {}, params = {}) {

  }

  // async sanitizeAndValidateHook

}
