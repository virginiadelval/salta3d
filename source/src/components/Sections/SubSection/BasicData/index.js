import React, { useState } from 'react'

import PropTypes from 'prop-types'

import { Box, Typography, Grid, makeStyles, Link, TextField, Button, CircularProgress, Alert } from '@mui/material'

import decorators from 'theme/fontsDecorators'

import ContainerBar from 'components/Sections/ContainerBar'
import SelectParcel from 'components/Sections/SubSection/SelectParcel'
import Carrousel from 'components/Carrousel'

import { useSelector, useDispatch } from 'react-redux'
import { actions as parcelActions } from 'state/ducks/parcel'
import { actions as basicDataActions } from 'state/ducks/basicData'

import { getBasicData } from 'utils/configQueries'

import styles from './styles'

const Details = ({ styles, decorators, title, value, format }) => (
  <>
    <Box sx={styles.card}>
      <Grid container>
        <Grid item xs={7}>
          <Typography variant="subtitle2" sx={decorators.bold}>
            {title}
          </Typography>
        </Grid>
        <Grid item xs={5}>
          <Typography variant="subtitle2" sx={styles.value}>
            {format === 'url' && value[0] && (
              <a
                class="external"
                href={value[0]}
                target="_blank"
                rel="noopener noreferrer"
              >
                {value[2]}
              </a>
            )}
            {format === 'url' && !value[0] && 'Cargando. . .'}
            {format !== 'url' &&
              value[0] !== undefined &&
              `${value[0]} ${format}`}
            {format !== 'url' && value[0] === undefined && 'Cargando. . .'}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  </>
)

const BasicData = () => {
  const data = useSelector((state) => state.basicData.data)
  const constitucionEstadoParcelario = useSelector(
    (state) => state.basicData.data.constitucionEstadoParcelario
  )
  const linkImagen = useSelector((state) => state.buildable.data?.link_imagen)
  const superficieParcela = useSelector(
    (state) => state.buildable.data.superficie_parcela
  )
  const isSelected = useSelector((state) => state.basicData.isSelected)
  const { photoData } = data

  const dispatch = useDispatch()
  const [searchCatastro, setSearchCatastro] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const handleSearchSubmit = async (e) => {
    e.preventDefault()
    if (!searchCatastro.trim()) return

    setIsSearching(true)
    setSearchError('')

    try {
      const actionResult = await dispatch(basicDataActions.seekerParcel(searchCatastro.trim()))
      if (basicDataActions.seekerParcel.rejected.match(actionResult)) {
        throw new Error(actionResult.error.message || 'Catastro no encontrado o error en la búsqueda.')
      }
      setSearchCatastro('')
    } catch (err) {
      console.error(err)
      setSearchError(err.message || 'Error en la búsqueda.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleClearParcel = () => {
    dispatch(parcelActions.clean())
    dispatch(basicDataActions.clean())
  }

  return (
    <ContainerBar type="list">
      {/* Search box always visible at the top */}
      <Box sx={{
        p: 2,
        mb: 2.5,
        borderRadius: 2,
        backgroundColor: '#fff',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
      }}>
        <Typography variant="subtitle2" sx={{ ...decorators.bold, mb: 1.5, color: '#333' }}>
          Consulta por Número de Catastro
        </Typography>
        <form onSubmit={handleSearchSubmit}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={searchCatastro}
              onChange={(e) => setSearchCatastro(e.target.value)}
              placeholder="Ingresar número (ej. 163158)"
              size="small"
              fullWidth
              variant="outlined"
              disabled={isSearching}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  backgroundColor: '#fafafa',
                }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={isSearching}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 'bold',
                px: 3,
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#115293',
                }
              }}
            >
              {isSearching ? <CircularProgress size={20} color="inherit" /> : 'Buscar'}
            </Button>
          </Box>
        </form>
        {searchError && (
          <Alert severity="error" sx={{ mt: 1.5, borderRadius: 1.5, py: 0.5 }}>
            {searchError}
          </Alert>
        )}

        {/* If parcel is selected, display a clear option / active indicator */}
        {isSelected && data && data.smp && (
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 1.5,
            pt: 1.5,
            borderTop: '1px dashed rgba(0,0,0,0.1)'
          }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1a237e' }}>
              Catastro Activo: {data.smp}
            </Typography>
            <Button
              variant="text"
              size="small"
              onClick={handleClearParcel}
              sx={{
                textTransform: 'none',
                color: '#d32f2f',
                fontWeight: 'bold',
                p: 0,
                minWidth: 0,
                '&:hover': {
                  backgroundColor: 'transparent',
                  textDecoration: 'underline'
                }
              }}
            >
              Cambiar Parcela
            </Button>
          </Box>
        )}
      </Box>

      {isSelected && (
        <Box>
          {!!photoData?.length && <Carrousel photos={photoData} />}
          {getBasicData().map(({ title, fill, format, isNumber }, index) => {
            const fills = fill.split(',')
            const value = []

            const valueFill =
              fill === 'superficie_parcela'
                ? superficieParcela?.toString()
                : data[fills[0]]
            if (valueFill !== undefined && valueFill !== null && valueFill !== '') {
              value.push(
                isNumber
                  ? Number.parseFloat(valueFill).toLocaleString('es-AR')
                  : valueFill
              )
            }
            if (format === 'url' && linkImagen) {
              value.push(linkImagen[fills[0]])
              value.push(...fills)
            }
            return (
              <Details
                // eslint-disable-next-line react/no-array-index-key
                key={title}
                styles={styles}
                decorators={decorators}
                title={title}
                value={value}
                format={format}
              />
            )
          })}
          {constitucionEstadoParcelario?.data.length > 0 &&
            constitucionEstadoParcelario.data.map((data) => (
              <Box
                key={`${data.estado_parcelario_constituido}_${data.fecha_de_constitucion}`}
                sx={styles.parcelarioAlert}
              >
                <Typography variant="subtitle2">
                  <Typography
                    variant="subtitle2"
                    component="span"
                    sx={decorators.bold}
                  >
                    Estado parcelario constituido:{' '}
                  </Typography>
                  {data.estado_parcelario_constituido}
                </Typography>
                <Typography variant="subtitle2">
                  <Typography
                    variant="subtitle2"
                    component="span"
                    sx={decorators.bold}
                  >
                    Fecha de constitución:{' '}
                  </Typography>
                  {data.fecha_de_constitucion}
                </Typography>
                <Typography variant="subtitle2">
                  <Typography
                    variant="subtitle2"
                    component="span"
                    sx={decorators.bold}
                  >
                    Tipo de constitución:{' '}
                  </Typography>
                  {data.tipo_de_construccion}
                </Typography>
                <Typography variant="subtitle2">
                  <Typography
                    variant="subtitle2"
                    component="span"
                    sx={decorators.bold}
                  >
                    Vencimiento de constitución:{' '}
                  </Typography>
                  {data.vencimiento_de_construccion}
                </Typography>
              </Box>
            ))}
        </Box>
      )}
      {!isSelected && <SelectParcel />}
    </ContainerBar>
  )
}

Details.propTypes = {
  styles: PropTypes.objectOf(makeStyles).isRequired,
  decorators: PropTypes.objectOf(PropTypes.string).isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.arrayOf(PropTypes.string),
  format: PropTypes.string.isRequired
}

Details.defaultProps = {
  value: ''
}

export default BasicData
