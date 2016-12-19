import './polyfill'
import 'normalize.css'
import 'styles/index.scss'

import React from 'react'
import { render } from 'react-dom'
import { Router, browserHistory } from 'react-router'

import routes from 'modules/routes'

/******************************************************************************/
// Setup
/******************************************************************************/

window.onload = () => {
  const mainTag = document.getElementsByTagName('main')[0]
  render(<Router routes={routes} history={browserHistory}/>, mainTag)
}
