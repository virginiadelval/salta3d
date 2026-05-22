import React from 'react'

import ReactGA from 'react-ga4'

import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import theme from 'theme'

import { createRoot } from 'react-dom/client'
const container = document.getElementById('root')
const root = createRoot(container)

import { Provider } from 'react-redux'

import ReactFontLoader from 'react-font-loader'

import store from 'state'

import App from './App'

import * as serviceWorker from './serviceWorker'

const GA4_MEASUREMENT_ID = 'G-K606PEVNSS'

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
  ReactGA.initialize(GA4_MEASUREMENT_ID)
} else {
  // eslint-disable-next-line no-console
  console.warn(`Google Analytics was omitted.
    process.env.NODE_ENV: ${process.env.NODE_ENV}`)
}

root.render(
  <ThemeProvider theme={theme}>
    <Provider store={store}>
      {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
      <CssBaseline />
      <ReactFontLoader
        fonts={[
          { name: 'Manrope', weights: [300, 400, 500, 600, 700] },
          { name: 'Montserrat', weights: [400, 600, 700, 800] }
        ]}
      />
      <App />
    </Provider>
  </ThemeProvider>
)
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
