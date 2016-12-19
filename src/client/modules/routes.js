import React from 'react'
import { Route, IndexRoute } from 'react-router'
import { Home } from 'pages'
import { Navigation } from 'components'

export default <Route path='/' component={Navigation}>
    <IndexRoute transition='navigate' component={Home}/>
  </Route>
