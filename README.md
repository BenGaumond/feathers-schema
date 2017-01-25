# Feathers Schema
___

<div style='color: #9b200d; background-color: #f2a69b;'>
<h1><strong style='color: #9b200d;'>DOCUMENTATION INCOMPLETE</strong></h1>
  <p style='margin: 0.125rem'>
  If you're reading this, it's because you came to the github page while I'm still in the process
  of finalizing the alpha stage of feathers-schema and in the midst of writing the documentation

  The following make stop abruptly, and not make any sense at all.
  </p>
</div>

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

Quite right, very much so. Mongoose has an intuitive and reliable syntax for creating schemas that I shamelessly ripped off while creating this package. If you're familiar with mongoose,
you'll be right at home with feathers-schema.

**Then why not just use Mongoose? Mongoose works with feathers.**

Go for it! Mongoose is a mature, stable and reliable, and this package is not an attempt to
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
  const beforeHooks = {
    create: [...articleSchema.hooks],
    patch: [...articleSchema.hooks],
    update: [...articleSchema.hooks]
  }

  articleService.before(beforeHooks)
```

**Alternatively**, if you're going to be weaving other hooks throughout for more advanced cases
_(or if you're a filthy es5 casual who isn't yet usings the rest/spread operator)_
you can do this:
```js
const schemaHooks = [
  articleSchema.hooks.populate,
  articleSchema.hooks.sanitize,
  articleSchema.hooks.validate
]

const beforeHooks = {
  create: schemaHooks,
  patch: schemaHooks,
  update: schemaHooks
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
