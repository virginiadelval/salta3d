import React from 'react'

export default () => (
  <img
    src={(process.env.PUBLIC_URL ? process.env.PUBLIC_URL : '.') + '/favicon_ba.png'}
    alt="Logo"
    style={{ width: '48px', height: '48px', margin: 'auto', display: 'block' }}
  />
)
