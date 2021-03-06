# Feathers Schema

# ALPHA VERSION DOCUMENTATION
If you're reading this, feathers-schema is in alpha, and not all of the functionality is fully described or finalized.
___
# Why?

  - You're using [feathers.js](http://www.feathersjs.com) serverside, and you'd like to validate data.
  - You'd also like to validate this data using a variety of database adapters with the same syntax.
  - You'd like to validate data client-side using the same schemas that you create to validate serverside, because you understand the benefits of isomorphism.
  - You're one of those cools we keep hearing about.

___

# QuickStart

The following assumes you're familiar with [feathers.js](http://www.feathersjs.com) workflow. If you've never heard of [feathers.js](http://www.feathersjs.com) before, it's great. Learn it: [feathers.js](http://www.feathersjs.com)

## Install

`` npm install feathers-schema ``

## Define a Schema

```js
import Schema from 'feathers-schema'

const articleSchema = new Schema({
  writeup: String,
  published: { type: Boolean, default: false },
  author: {
    required: true,
    name: { type: String, required: true, trim: true },
    age: { type: Number, range: ['>', 16, 'Must be over 16 years old.'] }
  },
  comments: [String]
})

```
**Hmm... Looks a lot like writing schemas for Mongoose.**

Quite right. Mongoose has an intuitive syntax for creating schemas that I shamelessly
ripped off while creating this package. If you're familiar with mongoose, feathers-schema will be easy mode.

**Then why not just use Mongoose? Mongoose works with feathers.**

Go for it! Mongoose is mature, stable and reliable, and this package is not an attempt to replace it.

The scope of this tool is much more limited than Mongoose. You cannot create document instances with feather-schema, or directly interact with a database: feathers-schema _only_ validates data.

Feathers.js focuses on being loose, agnostic, and lightweight. This tool is simply an extension of that mindset.

## Use in a Service

Lets create an app with the minimum functionality required to test a service:
```js
import feathers from 'feathers'
import hooks from 'feathers-hooks'

//this will create an app that allows you to create documents server-side only
const app = feathers()
  .configure(hooks())
```

Then, we'll create a service using the article schema we created above:
```js
import memory from 'feathers-memory'

//For the sake of example, we'll create a service that stores data in memory
const articleService = app.use('/articles', memory())
```

Here's where the magic happens. A schema automatically builds the hooks relevant to validating data, and stores them in on its own hooks object.

You can only put schema hooks on 'before' 'create'/'patch' or 'update' methods,
and typically you'd want them on all three:
```js

  const articleHooks = [...articleSchema.hooks]

  const before = {
    create: articleHooks,
    patch: articleHooks,
    update: articleHooks
  }

  articleService.hooks({ before })
```

**Alternatively**, if you're going to be weaving other hooks throughout for more advanced cases _(or if you're a filthy es5 casual who isn't yet using the rest/spread operator)_ you can do this:
```js
const articleHooks = [
  articleSchema.hooks.populate,
  articleSchema.hooks.sanitize,
  articleSchema.hooks.validate
]

const before = {
  create: articleHooks,
  patch: articleHooks,
  update: articleHooks
}

articleService.hooks({ before })

```

Now, your service will validate document data:
```js
  app.service('articles')
    .create({
      writeup: 'Buzzwords and such.'
    })
    .catch(err => console.log(err)) // { errors: { author: 'Required.' } }
```

And sanitize it as well:
```js
  app.service('articles')
    .create({
      writeup: 'This is an unpublished article.',
      author: {
        name: '  Whitespace Mgee   '
      }
    })
    .then(savedDoc => console.log(savedDoc))/*:
      {
        writeup: 'This is an unpublished article.'
        published: false, // <- false by default
        author: {
          name: 'Whitespace Mgee' //<- trimmed
          age: null // unprovided fields will be stored as null
        },
        comments: null
      }
    */
  }
```
____

# Types

The most basic attribute a property can have is it's type:
```js
new Schema({
  property: { type: String }
})

```
If you only need to define a type, and no other attributes:
```js
new Schema({ property: String })

```

You can also define weather the property is intended to be an array of items by
wrapping the rest of the definition in an array:
```js
new Schema({ property: [String] })
```

A Schema can be composed of properties of the following types:
+ **String**
+ **Number**
+ **Boolean**
+ **Date**
+ **Object**
+ **ANY** ( _defined as_ ```null```)

Without any further attributes, properties are nullable by default. That is, a missing or invalid property will be stored in the database as ```null```.

## ```Object``` type

Type ```Object``` does not mean _any_ object. It specifically means plain key-value
objects. If you are creating a nested property, it will default to ```Object```.

```js

new Schema({

  //Objects types with no sub properties may have any structure, and will not
  //be validated further.
  metadata_v1: Object, // { whatever: ['you want'], is: ['fine']} √
  metadata_v2: {},     //

  //However, it can only be placed in an array if the property is defined as
  //an array
  metadata_v3: [Object], //[{cool: true}, {beans: true}] √
  metadata_v4: [{}],

  //Object types with at least one nested property will be limited in structure
  //to those properties:
  name: {
    first: String,
    last: String
  } // { first: 'Jim', last: 'Beam', isABottleOfWhiskey: true } <-- last key will
  //be filtered by type sanitizer
})

```

## ```ANY``` type

The ```ANY``` type means _almost_ any type. Like ```Object``` type, it needs to be defined
as an array property if it's intended to be able to take arrays.

```js
import { ANY } from 'feathers-schema/types'

new Schema({
  whatever_v1: ANY,
  whatever_v2: null, // ANY === null, literally

  whatever_v3: undefined, // throws error. Must be null

  whatever_array_v1: [],
  whatever_array_v2: [ANY]
})
```

ANY type is of course the most malleable. Strings, numbers, Objects, whatever. It
also has the least number of attributes that apply to it, and cannot validate
nested properties.
___

# Sanitization vs Validation

Some attributes will sanitize a value, and some will validate a value.

A schema has methods that can be called by client code or server hooks,
that handle each:

```js
  const schema = new Schema({
    name: {
      type: String, /// type is a validator attribute
      trim: true    /// trim is a sanitizer attribute
    }
  })

  //Sanitizers take data and output sanitized data
  schema.sanitize({ name: '  whitespace mcgee  '})
    .then(data => console.log(data)) // { name: 'whitespace mcgee' }

  //Validators take data and output errors
  schema.validate({ name: 1000 })
    .then(result => console.log(result)) // { name: 'Expected String.'}

  //If there are no errors, schema.validate will return false
  schema.validate({ name: 'whitespace mcgee'})
    .then(result => console.log(result)) // false
```

Sanitization should happen before validation.
___

# Attributes

## Attribute signatures

Some attributes can be configured with a number of options, some attributes
are enabled simply by being a key.

Attributes configurations can be input as a single value, array, or object:
```js
new Schema({
  //with some config value, expected to be a number
  prop1: { attribute: 100 },
  //with some other config value, expected to be a string
  prop1: { attribute: 'Error Message.' },
  //both, implicitly in an array
  prop2: { attribute: ['Error Message.', 100] },
  //explicitly defined as an object
  prop3: { attribute: { msg: 'Error Message.', option: 100 } }
})
```

## ```String``` attributes

Using feathers-schema, blank strings are converted to ```null```.

### ```length```

The ```length``` attribute validates the length of a string.
```js
/*

Configurations: * = required
{ min: Number*, max: Number*, msg: String }
-or-
{ value: Number*, compare: ('<=', '<', '>' or '>=')*, msg: String }

*/

const msg = 'Fool! You\'ll kill us all!'
const type = String
new Schema({
//Ways to validate a string of 144 characters or less:
  tweet_v1: { type, length: ['<=', 144, msg] },
  tweet_v2: { type, length: [msg, 144, '<=' ] }, //order irrelevant
  tweet_v3: { type, length: { value: 144, compare: '<=', msg } },
  tweet_v4: { type, length: [0, 144, msg] },
  tweet_v4: { type, length: [144, msg, 0] }, //once again, order irrelevant
  tweet_v5: { type, length: { min: 0, max: 144, msg }},

//these will break:
  tweet_wrong_v1: { type, length: { min: 144, max: 0 } }, // min must be below max
  tweet_wrong_v2: { type, length: [0, msg] }, //must supply a comparer with only one value
  tweet_wrong_v3: { type, length: [0, 144, '<=' ]}, //compare only works with a single value

//or, be a smartass:
  tweet_lulz: { type, length: [0, 144, '<=>', msg] } //you figured out what I used for the in-between comparison operator, you are cool
})

```

### ```format```, ```email```, ```alpha```, ```numeric```, ```alphanumeric``` and ```nospaces```

The ```format``` attribute will validate a string against a regular expression. It will
throw an error if an input value does not pass the regular expression test() method.
```js
/*

Configuration: * = required
{ exp: RegExp*, msg: String }

*/

const schema = new Schema({
  zoomy: { type: String, format: [/zoom/, 'Must contain the word "zoom"'] }
})
```

The ```email```, ```alpha```, ```numeric```, ```alphanumeric``` and ```nospaces``` attributes are simply canned ```format``` validators:

```js
/*

Configuration:
{ msg: String }

*/

const type = String
const schema = new Schema({
  email: { type, email: true },
  name: { type, alpha: 'Only letters in your name there, cheif.' },
  order: { type, numeric: true },
  alias: { type, alphanumeric: 'Your cool nickname cannot have any symbols.' },
  password: { type, nospaces: 'No spaces in your password, please.' },
})

```

### ```lowercase```, ```uppercase``` and ```trim```

```js
/*
No Configuration
*/

const schema = new Schema({
  loud: { type: String, uppercase: true },
  quiet: { type: String, lowercase: true },
  pretty: { type: String, trim: true },
})

schema.sanitize({
  loud: 'hey',
  quiet: 'HO',
  pretty: '      Im whitespace mcgee        '
})
.then(data => console.log(data))
//^^
//{
//  loud: 'HEY',
//  quiet: 'ho',
//  pretty: 'Im whitespace mcgee'
//}
```

## ```Number``` attributes

### ```range```
The ```range``` attribute validates the range of a number.
```js
/*

Configurations: * = required
{ min: Number*, max: Number*, msg: String }
-or-
{ value: Number*, compare: ('<=', '<', '>' or '>=')*, msg: String }

*/

const type = Number
new Schema({
  //Between Configurations:
  SIN: { type, range: [100000000, 999999999] },
  age: { type, range: { min: 19, max: 99, msg: 'No teenagers or centenarians.'} },

  //Compare Configurations:
  villagePopulation: { type, range: ['<', 10000, 'More than ten thousand people is not considered a village.']},
  celsius: { type, range: { value: -273.15, compare: '>=', msg: 'Must be above absolute Zero.' }}

})

```

### ```even``` and ```odd```

Pretty self explanatory:
```js
/*

Configuration: * = required
{ msg: String }

*/

const type = Number
new Schema({
  bestOfRounds: { type, odd: true },
  totalShoes: { type, even: true }
})


```

## General attributes

General attributes can be applied to a many (or all) types.

### ```default```

The ```default``` attribute can be placed on any type. It will sanitize ```undefined```
or ```null``` values as the provided default.
```js
/*

Configuration: * = required
{ value:(property type or Function)*,  msg: String }

*/

new Schema({
  score: { type: Number, default: 0 },
  //default may also take a function
  chant: { type: String, default: () => 'go sports team!\n'.repeat(5) }
})
```


### ```required```

The ```required``` attribute can be placed on any type. It will validate undefined or
null values, throwing an error.

```js
/*

Configuration: * = required
{ condition:Function*,  msg: String }

*/

const onFridays = () => new Date().getDay() === 5

new Schema({
  name: { type: String, required: true },
  //required may also take a function
  coverCharge: { type: String, required: onFridays }
  //required attribute on an array property means that the array must exist,
  //and must have more than 0 items
  comments: [{ type: String, required: true }]
})
```

## Hook attributes

Hook attributes only have an effect when the schema is being used in a feathers
service in the form of hooks. If you're just calling the validate/sanitize methods
on a built schema (if you're using them client side, for example) they will not
do anything.

### ```unique```

The ```unique``` attributes validates that a property value is unique amongst all other documents in it's service.

```js
/*
Configuration: * = required
{ msg: String }
*/

new Schema({
  accountName: { type: String, unique: true }
})
```

### ```service```

It acts as an associative filter, only allowing values that correspond with ids of
other services. It's important to ensure that the type property being used matches the type of
id the database adapter for that service is using.

```js

/*

Configuration: * = required
{ name: String* }

*/

//linking to two hypothetical services that are using, say, mongodb
new Schema({
  essay: String,
  author: { type: Number, service: 'authors' },
  comments: [{ type: Number, service: 'comments'}]
})

```
___

# Custom Validators and Sanitizers

## ```sanitize``` and ```validate```
You can create your own functions to sanitize an validate data with the ```sanitize``` and ```validate``` attributes, respectively.

```js

const batmanify = () => {

  // MUST be created out of higher-order functions.
  // This example doesn't require any set up, it simply returns the actual method
  return value => {

    // null or undefined values should be ignored by a sanitizer, by convention.
    // If you'd like to give a property a default value, use the 'default' sanitizer.
    if (value == null)
      return value

    return value.replace(/bruce\swayne/gi, 'Batman')

  }
}

new Schema({

  article: {
    type: String,
    sanitize: batmanify
  }

})

```

## Accessing Property Info

When creating a validator or sanitizer, you can access property info to ensure proper
usage or to help with validation.

```js

//Ensure that you use the function keyword, NOT an arrow function
function supermanify() {

  //this.type will contain a type of the current property.
  if (this.type !== String)
    //this.key will contain the name of the current property.
    throw new Error(`${this.key} is not a String property. 'supermanify' must be placed on String properties.`)

  return value => {

    //null or undefined values should be ignored by a sanitizer, by convention.
    //If you'd like to give a property a default value, use the 'default' sanitizer.
    if (value == null)
      return value

    return value.replace(/clark\skent/gi, 'Superman')

  }
}

new Schema({

  article: {
    type: String,
    sanitize: supermanify
  }

})

```

### Accessible Property Info:

Inside of a ```function(){}``` higher order function, here are the properties you
Should be able to reference:

``key``: The key of the property.
``array``: True if this is an array property, false if not.
``type``: The data type of this property. ``null`` if ANY.
``parent``: A link to the parent property, if any.


## Using Parameters

If used serverside, your validate or sanitize function is provided with a number of parameters:

```js

function customValidatorOrSanitizer () {

  return (value, params) => { }
                //^^^^
}

```

### Accessible Parameters:

Inside of a ```function(){}``` higher order function, here are the properties you
Should be able to reference:

``id``: Id of the document currently being validated, if provided by the hook
``method``: Hook method currently being executed: *create*, *patch*, or *update*
``service``: Service object the document belongs to.
``app``: Link to the feathers app.
``data``: Data stored in hook.data.

Its important that you handle the case of the parameters not being provided, otherwise
your validator will break client-side.

___

# Custom Types

The default types are a narrow subset of Javascript types that translate well to
database types. You can also add existing or custom types to *feathers-schema*.

```js
import { ObjectID } from 'mongodb'
import Schema, { types } from 'feathers-schema'

const idSchema = new Schema({ _id: ObjectID }) // throws 'Malformed property: ObjectID is not a valid type.'

types.setCustom(ObjectID)

const idSchema = new Schema({ _id: ObjectID }) // will not throw

```

## Casting

Schema's sanitization phase will take any value supplied and try to cast it to it's intended type. If it cannot cast a value to it's intended type, it will turn it to
``null``.

If you are providing a custom type, it will try to cast a value to that type by
using the type as a constructor:

```js
const { _id } = await idSchema.sanitize({ _id: '59b339090149b98c0a74332d' })
// is equivalent to
const _id = new ObjectID('59b339090149b98c0a74332d')
```

However, this may not always be suitable for any custom type:

```js
import Schema, { types } from 'feathers-schema'

class Vector2 {
  constructor (x, y) {
    this.x = typeof x === 'number' ? x : 0
    this.y = typeof y === 'number' ? y : 0
  }
}

types.setCustom(Vector2)

const transform = new Schema({
  position: Vector2,
  scale: Vector2
})

const data = await transform.sanitize({
  position: { x: 1, y: 2 },
  scale: { x: 1, y: 2 }
})
// is equivalent to
const data = {
  position: new Vector2({ x: 1, y: 2}),
  scale: new Vector2({ x: 1, y: 2 })
}

// Which will result in:
console.log(data) // { position: { x: 0, y: 0 }, scale: { x:0, y:0 } }
```

This is a contrived example. If Vector2 was your own type, you'd clearly write a
more liberal constructor. However, if you're using a type from a library, you may
need to write a function to cast the value into something the type can construct with:

```js
types.setCustom(Vector2, input => {

  return typeof input === 'object'
    ? new Vector2(input.x, input.y)
    : new Vector2(input, input)
})
```

The second argument to setCustom will alter the casting function for the specified type.

You can ALSO alter the casting functions for default types:

```js
types.setCustom(String, value => escape(`${value}`))
```

But it is wiser to provide custom sanitizers that custom casters.

## Backing Type and Serialization

If the custom type you're adding is supported by your database (such as an ObjectID),
then you don't have to make any further considerations for Serialization.

```js
//TODO: describe how to set up a backing type and serialize/deserialize functions
// for custom types
```
___

# Associations
```js
//TODO: finish this example once associations are fleshed out.
```

___

# Further Considerations

```js
// TODO detail further considerations about interweaving hooks, database adapter
// restrictions (if any)

```
