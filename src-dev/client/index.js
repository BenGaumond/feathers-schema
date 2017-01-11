import React from 'react'
import { render } from 'react-dom'

/* global HOST */

window.onload = () => {

  const main = document.getElementsByTagName('main')[0]

  render(<h1>{HOST}</h1>, main)

}
