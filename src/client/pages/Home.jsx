import React from 'react'

export default function Home({children, ...other}) {

  return <div {...other}>
    <h1>CHANGE YOUR NUT</h1>
    {children}
  </div>
}
