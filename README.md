# Feathers Schema

# DOCUMENTATION INCOMPLETE
If you're reading this, it's because you came to the github page while I'm still in the process of finalizing the alpha stage of feathers-schema and in the midst of writing the documentation.

The following may stop abruptly, be inaccurate, or not make any sense at all.

___
## Why?
  - You're using feathers.js serverside, and you'd like to validate data.
  - You'd also like to validate this data using a variety of database adapters with the same syntax.
  - You'd like to validate data client-side using the same schemas that you create to validate serverside, because you understand the benefits of isomorphism.
  - You're one of those cools we keep hearing about.

___

# QuickStart

The following assumes you're familiar with feathers.js workflow. If you've never heard of feathers.js before, it's great. Learn it: [feathers.js](http://www.feathersjs.com)

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

Quite right. Mongoose has an intuitive and reliable syntax for creating schemas
that I shamelessly ripped off while creating this package. If you're familiar with
mongoose, feathers-schema will be easy mode.

**Then why not just use Mongoose? Mongoose works with feathers.**

Go for it! Mongoose is mature, stable and reliable, and this package is not an attempt to
replace it.

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

Here's where the magic happens. A schema automatically builds
the hooks relevant to validating data, and stores them in on its own hooks object.

You can only put schema hooks on 'before' 'create'/'patch' or 'update' methods,
and typically you'd want them on all three:
```js

  const articleHooks = [...articleSchema.hooks]

  const beforeHooks = {
    create: articleHooks,
    patch: articleHooks,
    update: articleHooks
  }

  articleService.before(beforeHooks)
```

**Alternatively**, if you're going to be weaving other hooks throughout for more advanced cases
_(or if you're a filthy es5 casual who isn't yet usings the rest/spread operator)_
you can do this:
```js
const articleHooks = [
  articleSchema.hooks.populate,
  articleSchema.hooks.sanitize,
  articleSchema.hooks.validate
]

const beforeHooks = {
  create: articleHooks,
  patch: articleHooks,
  update: articleHooks
}

articleService.before(beforeHooks)

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

# Attributes

The most basic attribute a property can have is it's type:
```js
new Schema({
  property: { type: String }
})

```
Shortcut:
```js
new Schema({
  property: String
})

```

You can also define weather the property is intended to be
an array of items or not, by wrapping the rest of the definition in an array:
```js
new Schema({
  property: [String]
})
```

A Schema can be composed of properties of the following types:
+ **String**
+ **Number**
+ **Boolean**
+ **Date**
+ **Buffer**
+ **ObjectId**
+ **Object**
+ **ANY** ( _defined as_ ```null```)

Without any further attributes, properties are nullable by default. That is, a missing or invalid property will be stored in the database as ```null```.


## Attribute Signatures

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
  prop2: { attribute: ['Error Message.', 100]},
  //explicitly defined as an object
  prop3: { attribute: { msg: 'Error Message.', option: 100 } }
})
```

## String Attributes

Using feathers-schema, blank strings are converted to ```null```.

### length

The length attribute validates the length of a string.
```js
/*

Configurations: * = required
{ min: Number*, max: Number*, msg: String }
-or-
{ value: Number*, compare: ('<=', '<', '>' or '>=')*, msg: String }

*/

const msg = 'Fool! Tweets must be under a hundred and forty four characters! You\'ll kill us all!'
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

### format, email, alpha, numeric, alphanumeric and nospaces

The format attribute will validate a string against a regular expression. It will
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

email, alpha, numeric, alphanumeric and nospaces are simply canned format validators:
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

### lowercase, uppercase and trim

These attributes sanitize a string property.
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

## Number Attributes

### range
The range attribute validates the range of a number.
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
  SIN: { type, range: [1000000000, 999999999] },
  age: { type, range: { min: 19, max: 99, msg: 'No teenagers or centenarians.'} },

  //Compare Configurations:
  villagePopulation: { type, range: ['<', 10000, 'More than ten thousand people is not considered a village.']},
  celsius: { type, range: { value: -273.15, compare: '>=', msg: 'Must be above absolute Zero.' }}

})

```

### even and odd

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

## General Attributes

General attributes can be applied to a many (or all) types.

### default

The default attribute can be placed on any type. It will sanitize undefined
values as the provided default.
```js
new Schema({
  score: { type: Number, default: 0 }
})
```

### required

The required attribute can be placed on any type. It will return an error to
any value that is null or undefined.
```js
new Schema({
  name: { type: String, required: true }
})
```
