import React, { useEffect } from 'react'

import PropTypes from 'prop-types'

import {
  Typography,
  IconButton,
  CircularProgress,
  Card,
  Tooltip
} from '@mui/material'
import { Warning } from '@mui/icons-material'

import ContainerBar from 'components/Sections/ContainerBar'
import { actions } from 'state/ducks/reports'
import { useDispatch, useSelector } from 'react-redux'

import styles from './styles'

const Item = ({ smp, address, state, onClick }) => {
  return (
    <Card sx={styles.card}>
      <Typography variant="subtitle1">SMP: {smp}:</Typography>
      {state === 'ready' && (
        <Tooltip title="descarga Certificado Urbanístico">
          <IconButton onClick={() => onClick('PDF')} sx={styles.icon}>
            <img
              src="https://epok.buenosaires.gob.ar/media/repok/uploads/mapainteractivoba/Certificado_Urbanistico_.png"
              width="24px"
            />
          </IconButton>
        </Tooltip>
      )}
      {state === 'loading' && <CircularProgress sx={styles.icon} size={20} />}
      {state === 'error' && (
        <Tooltip title="No disponible actualmente">
          <Warning sx={styles.icon} size={20} />
        </Tooltip>
      )}
      <Typography variant="subtitle1">Dirección: {address}</Typography>
    </Card>
  )
}
const Report = () => {
  const dispatch = useDispatch()
  const smp = useSelector((state) => state.parcel.smp)
  const reports = useSelector((state) => state.reports)

  const handleOnClick = (type, key) => {
    if (type.toLowerCase() === 'pdf') {
      dispatch(actions.download(key))
    }
  }

  useEffect(() => {
    if (smp !== null) {
      dispatch(actions.getData(smp))
    }
  }, [dispatch, smp])

  return (
    <ContainerBar type="list">
      {Object.entries(reports).map(([key, { state, address }]) => (
        <Item
          key={key}
          smp={key}
          state={state}
          address={address}
          onClick={(type) => handleOnClick(type, key)}
        />
      ))}
    </ContainerBar>
  )
}

Item.propTypes = {
  smp: PropTypes.string,
  state: PropTypes.string,
  onClick: PropTypes.func,
  address: PropTypes.string
}

Item.defaultProps = {
  smp: '',
  state: '',
  onClick: '',
  address: ''
}

export default Report
