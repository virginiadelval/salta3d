import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import PropTypes from 'prop-types'

import { useSelector, useDispatch } from 'react-redux'

import { actions } from 'state/ducks/tour'
import { actions as explorerActions } from 'state/ducks/explorer'

import Tour from 'reactour'

import Routes from './routes'

import { largeScreenSteps } from './steps'

export const ModalContext = React.createContext({ isModalOpen: true })

export default function App({ isAuthenticated }) {
  const dispatch = useDispatch()
  const isMapReady = useSelector((state) => state.map.isMapReady)
  const isModalOpen = useSelector((state) => state.tour.showModal)
  const firstView = JSON.parse(localStorage.getItem('isModalOpen')) || false
  if (!firstView && isMapReady) {
    dispatch(actions.isVisibleTour(true))
    localStorage.setItem('isModalOpen', 'true')
  }

  const handleClose = () => {
    dispatch(actions.isVisibleTour(false))
  }

  useEffect(() => {
    if (isMapReady) {
      dispatch(explorerActions.loadExplorerOptions())
    }
  }, [isMapReady, dispatch])

  return (
    <>
      <BrowserRouter basename={(() => { const path = window.location.pathname; if (path.includes('/WebSalta3D')) return '/WebSalta3D'; if (path.includes('/salta3d')) return '/salta3d'; return ''; })()}>
        <Routes authed={isAuthenticated} />
      </BrowserRouter>
      <Tour
        disableInteraction
        steps={largeScreenSteps}
        isOpen={isModalOpen}
        onRequestClose={handleClose}
        maskSpace={1}
        className="tour"
        startAt={0}
      />
    </>
  )
}

App.propTypes = {
  isAuthenticated: PropTypes.bool
}
App.defaultProps = {
  isAuthenticated: false
}
