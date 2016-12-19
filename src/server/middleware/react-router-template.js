import path from 'path'
import fs from 'fs'

import React from 'react'
import { renderToString } from 'react-dom/server'
import { match, RouterContext } from 'react-router'
import routes from 'modules/routes'

import { NotFound, GeneralError } from 'feathers-errors'

/******************************************************************************/
// Helper
/******************************************************************************/

let template

function renderTemplate(reactComponent) {
  const reactMarkup = renderToString(reactComponent)
  return `${template[0]}<main>${reactMarkup}</main>${template[1]}`
}

export default function(app) {

  //Create Template
  const publicURL = app.get('public')
  const indexHtmlURL = path.join(publicURL, 'index.html')
  template = fs.readFileSync(indexHtmlURL, 'utf-8').split('<main/>')

  return function(req, res, next) {

    match({ routes, location: req.url }, (error, redirect, props) => {

      if (error)
        return next(new GeneralError(error.message))

      else if (redirect)
        res.redirect(302, redirect.pathname + redirect.search)

      else if (props)
        res.send(renderTemplate(<RouterContext {...props} />))

      else
        next(new NotFound('Not Found'))

    })

  }
}
