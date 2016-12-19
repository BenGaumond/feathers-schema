import React, { addons, cloneElement } from 'react'
// import { Link } from 'react-router'
import { variables } from 'styles'

const Transition = addons ? addons.CSSTransitionGroup : null

function Links() {
  return <div>Change your nut</div>
}

function Pages({children, ...other}) {
  return <div id='pages' {...other}>{children}</div>
}

export default function Navigation({children, routes}) {

  const route = routes ? routes[routes.length - 1] : {}

  //Navigation should be styled inverse if the current route is
  const { transition } = route

  const path = route.path || 'home'
  const key = path.match(/(\w+)/)[1]

  return <div>
    <Links/>
    { Transition ? <Transition
      component={Pages}
      transitionName={transition || 'none'}
      transitionEnterTimeout={variables.animationTime.value}
      transitionLeaveTimeout={variables.animationTime.value}>
      {cloneElement(children, { key })}
    </Transition> : children}
  </div>

}
