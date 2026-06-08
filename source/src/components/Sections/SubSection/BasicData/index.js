import React, { useState } from 'react'

import PropTypes from 'prop-types'

import { Box, Typography, Grid, makeStyles, Link, TextField, Button, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

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
          <Typography variant="subtitle2" sx={{ ...decorators.bold, whiteSpace: 'pre-wrap' }}>
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
  const { photoData, regimen, actividades, inmueble_protegido } = data

  const allBasicData = getBasicData()
  const serviciosFills = ['mvs_calle', 'mvs_af_header', 'mvs_recol', 'mvs_barrido', 'mvs_lusal', 'mvs_ev', 'mvs_semaforo']
  const propiedadFills = ['owner_name', 'owner_document', 'owner_cuit']
  const deletedFills = ['distrito', 'zoning_distrito', 'zoning_fos', 'zoning_fot_privado', 'zoning_fot_publico', 'zoning_altura_m', 'zoning_retiro_fondo', 'zoning_retiro_frente', 'zoning_criterio', 'zoning_area', 'mvs_valor_rang']

  const generalData = allBasicData.filter(item => 
    !serviciosFills.includes(item.fill) && 
    !propiedadFills.includes(item.fill) && 
    !deletedFills.includes(item.fill)
  )
  const serviciosData = allBasicData.filter(item => serviciosFills.includes(item.fill))
  const propiedadData = allBasicData.filter(item => propiedadFills.includes(item.fill))

  const renderDetailsItems = (items) => {
    return items.map(({ title, fill, format, isNumber }) => {
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
          key={title}
          styles={styles}
          decorators={decorators}
          title={title}
          value={value}
          format={format}
        />
      )
    })
  }

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

  const renderActivitiesByState = (activitiesList) => {
    if (!activitiesList || activitiesList.length === 0) {
      return <Typography variant="caption">No hay actividades registradas para este distrito.</Typography>
    }

    // Group by estado, then by categoria
    const grouped = {}
    activitiesList.forEach((act) => {
      const estado = act.estado || 'Otros'
      if (!grouped[estado]) grouped[estado] = {}
      const cat = act.categoria || 'Sin Categoría'
      if (!grouped[estado][cat]) grouped[estado][cat] = []
      grouped[estado][cat].push(act)
    })

    return Object.entries(grouped).map(([estado, categories]) => {
      let titleColor = '#2e7d32' // Green for Permitido
      if (estado.toLowerCase().includes('prohibid')) {
        titleColor = '#c62828' // Red for Prohibido
      } else if (estado.toLowerCase().includes('condicionad')) {
        titleColor = '#ef6c00' // Orange for Condicionado
      } else if (estado !== 'Permitido') {
        titleColor = '#455a64' // Grey for others

      }

      return (
        <Box key={estado} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: titleColor, borderBottom: `1px solid ${titleColor}`, pb: 0.5, mb: 1 }}>
            Actividades {estado}s
          </Typography>
          {Object.entries(categories).map(([categoria, items]) => (
            <Box key={categoria} sx={{ mb: 1.5, pl: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', color: '#555' }}>
                {categoria}
              </Typography>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '0.82rem', color: '#555' }}>
                {items.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '2px' }}>
                    <strong>{item.actividad}</strong> {item.subcategoria !== item.actividad ? `(${item.subcategoria})` : ''}
                  </li>
                ))}
              </ul>
            </Box>
          ))}
        </Box>
      )
    })
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
          {renderDetailsItems(generalData)}

          {/* Inmueble Protegido (PRAC) Accordion */}
          {inmueble_protegido === 'Si' && (
            <Accordion sx={{ mt: 2, borderRadius: 2, '&:before': { display: 'none' }, border: '1px solid rgba(245, 127, 23, 0.2)', boxShadow: '0 2px 8px rgba(245, 127, 23, 0.08)' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#fffde7', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ ...decorators.bold, color: '#f57f17', display: 'flex', alignItems: 'center', gap: 1 }}>
                  ⚠️ Inmueble Protegido (PRAC)
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1 }}>
                <List size="small" disablePadding>
                  {data.prac_inmueble && data.prac_inmueble !== 'N/A' && (
                    <ListItem divider sx={{ py: 0.5 }}><ListItemText primary="Inmueble / Denominación" secondary={data.prac_inmueble} secondaryTypographyProps={{ sx: { color: '#333', fontWeight: '500' } }} /></ListItem>
                  )}
                  {data.prac_categoria && data.prac_categoria !== 'N/A' && (
                    <ListItem divider sx={{ py: 0.5 }}><ListItemText primary="Categoría de Protección" secondary={data.prac_categoria} /></ListItem>
                  )}
                  {data.prac_tipologia && data.prac_tipologia !== 'N/A' && (
                    <ListItem divider sx={{ py: 0.5 }}><ListItemText primary="Tipología / Grado" secondary={data.prac_tipologia} /></ListItem>
                  )}
                  {data.prac_instrumento && data.prac_instrumento !== 'N/A' && (
                    <ListItem divider sx={{ py: 0.5 }}><ListItemText primary="Instrumento Legal" secondary={data.prac_instrumento} /></ListItem>
                  )}
                  {data.prac_ficha && data.prac_ficha !== 'N/A' && (
                    <ListItem divider sx={{ py: 0.5 }}><ListItemText primary="Ficha Nº" secondary={data.prac_ficha} /></ListItem>
                  )}
                  {data.prac_domicilio && data.prac_domicilio !== 'N/A' && (
                    <ListItem divider sx={{ py: 0.5 }}><ListItemText primary="Domicilio" secondary={data.prac_domicilio} /></ListItem>
                  )}
                  {data.prac_numero && data.prac_numero !== 'N/A' && (
                    <ListItem sx={{ py: 0.5 }}><ListItemText primary="Nº de Registro" secondary={data.prac_numero} /></ListItem>
                  )}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {propiedadData.length > 0 && (
            <Accordion sx={{ mt: 2, borderRadius: 2, '&:before': { display: 'none' }, border: '1px solid rgba(0,0,0,0.08)' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f9fafb', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ ...decorators.bold, color: '#1a237e' }}>
                  Datos de Propiedad
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1.5, pb: 0 }}>
                {renderDetailsItems(propiedadData)}
              </AccordionDetails>
            </Accordion>
          )}

          {serviciosData.length > 0 && (
            <Accordion sx={{ mt: 2, borderRadius: 2, '&:before': { display: 'none' }, border: '1px solid rgba(0,0,0,0.08)' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f9fafb', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ ...decorators.bold, color: '#1a237e' }}>
                  Servicios
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1.5, pb: 0 }}>
                {renderDetailsItems(serviciosData)}
              </AccordionDetails>
            </Accordion>
          )}
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

          {/* Régimen Urbanístico CPUA Section */}
          {regimen && (
            <Accordion sx={{ mt: 2, borderRadius: 2, '&:before': { display: 'none' }, border: '1px solid rgba(0,0,0,0.08)' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f9fafb', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ ...decorators.bold, color: '#1a237e' }}>
                  Régimen Urbanístico CPUA
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1 }}>
                <List size="small" disablePadding>
                  {regimen.sub_distrito && (
                    <ListItem divider><ListItemText primary="Sub Distrito" secondary={regimen.sub_distrito} /></ListItem>
                  )}
                  <ListItem divider><ListItemText primary="Superficie Mínima" secondary={regimen.sup_minima || 'N/A'} /></ListItem>
                  <ListItem divider><ListItemText primary="Frente Mínimo" secondary={regimen.frente_min || 'N/A'} /></ListItem>
                  <ListItem divider><ListItemText primary="F.O.T. Privado" secondary={regimen.fot_privado || 'N/A'} /></ListItem>
                  <ListItem divider><ListItemText primary="F.O.T. Público" secondary={regimen.fot_publico || 'N/A'} /></ListItem>
                  <ListItem divider><ListItemText primary="F.O.S. VU / VOMF / UC" secondary={`${regimen.fos_vu || 'N/A'} / ${regimen.fos_vomf || 'N/A'} / ${regimen.fos_uc || 'N/A'}`} /></ListItem>
                  <ListItem divider><ListItemText primary="Retiros (Jardín / Fondo / Perfil)" secondary={`${regimen.r_jardin || 'N/A'} / ${regimen.r_fondo || 'N/A'} / ${regimen.r_perfil || 'N/A'}`} /></ListItem>
                  <ListItem divider><ListItemText primary="Altura Máxima" secondary={regimen.altura_maxima || 'N/A'} /></ListItem>
                  {regimen.plantas && (
                    <ListItem divider><ListItemText primary="Plantas" secondary={regimen.plantas} /></ListItem>
                  )}
                  {regimen.fos && (
                    <ListItem divider><ListItemText primary="F.O.S. General" secondary={regimen.fos} /></ListItem>
                  )}
                  <ListItem divider><ListItemText primary="Retiro de Frente / Lateral" secondary={`${regimen.r_frente || 'N/A'} / ${regimen.r_lateral || 'N/A'}`} /></ListItem>
                  {regimen.r_fondo2 && (
                    <ListItem divider><ListItemText primary="Retiro de Fondo 2" secondary={regimen.r_fondo2} /></ListItem>
                  )}
                  {regimen.r_desde_lm && (
                    <ListItem divider><ListItemText primary="Retiro desde LM" secondary={regimen.r_desde_lm} /></ListItem>
                  )}
                  {regimen.altura_max && (
                    <ListItem divider><ListItemText primary="Altura Máxima Alternativa" secondary={regimen.altura_max} /></ListItem>
                  )}
                  {regimen.fuente && (
                    <ListItem divider><ListItemText primary="Fuente" secondary={regimen.fuente} /></ListItem>
                  )}
                  {regimen.referencia && (
                    <ListItem>
                      <ListItemText 
                        primary="Referencia / Notas de CPUA" 
                        secondary={regimen.referencia} 
                        secondaryTypographyProps={{ style: { whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#555' } }}
                      />
                    </ListItem>
                  )}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Actividades CPUA Section */}
          {actividades && actividades.actividades && (
            <Accordion sx={{ mt: 2, borderRadius: 2, '&:before': { display: 'none' }, border: '1px solid rgba(0,0,0,0.08)' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f9fafb', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ ...decorators.bold, color: '#1a237e' }}>
                  Actividades por Distrito CPUA
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2 }}>
                {renderActivitiesByState(actividades.actividades)}
              </AccordionDetails>
            </Accordion>
          )}
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
