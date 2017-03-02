import Schema, { Property } from './schema'

import * as types from './types'

import * as hooks from './hooks'

import * as validators from './validators'

import * as sanitizers from './sanitizers'

import { parseConfig, isPlainObject, array, idsMatch, rangeValidatorFactory, getIn,
  setIn, hasIn } from './helper'


export default Schema

export { Schema, Property,

  types, hooks, validators, sanitizers,

  //custom validator helpers
  idsMatch, parseConfig, rangeValidatorFactory,

  //generic helpers
  isPlainObject, array, getIn, setIn, hasIn }
