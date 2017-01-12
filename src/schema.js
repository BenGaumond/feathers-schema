import is from 'is-explicit'

import * as validates from './validators'
import * as sanitizes from './sanitizers'

import { sanitizeAndValidate } from './hooks'
import { getIn, setIn, isPlainObject } from './helper'
import deepFreeze from 'deep-freeze'

/******************************************************************************/
// Options
/******************************************************************************/

const DEFAULT_OPTIONS = {
  fillPatchData: false,
  canSkipValidation: () => false
}

/******************************************************************************/
// Defintions
/******************************************************************************/

function addCustom(defs, key, arr) {
  if (key in defs === false)
    return

  const def = defs[key]

  const custom = is(def, Array) ? def : [def]
  arr.push(...custom)
  delete defs[key]

}

function addStock(def, stock, arr) {
  for (const key in stock)
    if (key in def) {
      arr.push(stock[key](def[key]))
      delete def[key]
    }
}

function checkForNested(def, funcCount) {

  const hasNested = 'nested' in def
  if (hasNested && !isPlainObject(def.nested))
    throw new Error('nested property must be a plain object.')
  else if (hasNested)
    return def.nested

  const implicitNested = funcCount === 0
  if (!implicitNested)
    return null

  const implicit = {}
  for (const key of Object.keys(def))
    implicit[key] = def[key]

  return implicit

}

function createDefinition(schema, definition, path) {

  //cast path to arrayOf if it isn't already
  if (!is(path, Array))
    path = [path]

  //account for arrayOf in quick or plain notation
  const arrayOf = is(definition, Array)
  if (arrayOf && definition.length !== 1)
    throw new Error('Malformed definition. Properties defined as an arrayOf should contain a single element.')
  if (arrayOf)
    definition = definition[0]

  //account for quick notation
  if (is(definition, Function))
    definition = { type: { func: definition, arrayOf } }

  //convert type plain notation to explicit notation to ensure arrayOf is respected
  else if (is(definition.type, Function))
    definition.type = { func: definition.type, arrayOf }

  //ensure quick, plain, implicit or explicit notation satisfied
  if (!isPlainObject(definition))
    throw new Error('Malformed definition. Check feathers-schema documentation to learn how.')

  //get stock and custom validators
  const validators = []

  addStock(definition, validates, validators)
  addCustom(definition, 'validates', validators)
  addCustom(definition, 'validate', validators)


  //get stock and custom sanitizer
  const sanitizers = []

  addStock(definition, sanitizes, sanitizers)
  addCustom(definition, 'sanitizes', sanitizers)
  addCustom(definition, 'sanitize', sanitizers)

  const nested = checkForNested(definition, sanitizers.length + validators.length)
  if (nested && !isPlainObject(nested))
    throw new Error('Nested properties must be plain objects.')
  if (nested) {

    for (const key in nested)
      createDefinition(schema, nested[key], [...path, key])

    return
  }

  console.log(nested, sanitizers, validators)

  else if (sanitizers.length === 0 && validators.length === 0)
    throw new Error(`Malformed definition. No properties defined in ${path}`)

  //finish up
  setIn(schema.sanitizers, path, sanitizers)

  setIn(schema.validators, path, validators)

  schema.paths.push(path)

}

/******************************************************************************/
// Exports
/******************************************************************************/

export default class Schema {

  constructor(definitions, options) {

    //Check options
    if (is(options) && !isPlainObject(options))
      throw new Error('options, if supplied, is expected to be a plain object.')

    this.options = { ...DEFAULT_OPTIONS, ...(options || {})}

    if (is(this.options.canSkipValidation, Boolean))
      this.options.canSkipValidation = () => this.options.canSkipValidation

    if (!is(this.options.canSkipValidation, Function))
      throw new Error('Schema options.canSkipValidation is expected to be a boolean or a predicate function.')

    //Create definitions
    if (!isPlainObject(definitions))
      throw new Error('A schema must be created with a model definitions object.')

    for (const path in definitions)
      createDefinition(this, definitions[path], path)

    deepFreeze(this)
  }

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

      const sanitizers = getIn(this.sanitizers, path)
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

      const validators = getIn(this.validators, path)
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

  sanitizers = {}

  validators = {}

  paths = []

  applyHook = sanitizeAndValidate(this)

}
