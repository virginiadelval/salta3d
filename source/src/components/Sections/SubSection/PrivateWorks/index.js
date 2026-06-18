import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Grid
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import ContainerBar from 'components/Sections/ContainerBar'
import SelectParcel from 'components/Sections/SubSection/SelectParcel'
import { useSelector, useDispatch } from 'react-redux'
import { actions as basicDataActions } from 'state/ducks/basicData'
import buildPrivateWorksPDF from 'utils/privateWorksReportTemplate'
import decorators from 'theme/fontsDecorators'
import { getCustomDbApiUrl } from 'utils/configQueries'

const extractPlanData = (props) => {
  return {
    expediente: props.expediente || props.EXPEDIENTE || '-',
    catastro: props.catastro !== undefined && props.catastro !== null ? props.catastro.toString() : (props.CATASTRO !== undefined && props.CATASTRO !== null ? props.CATASTRO.toString() : '-'),
    plano: props.plano !== undefined && props.plano !== null ? props.plano.toString() : (props.PLANO !== undefined && props.PLANO !== null ? props.PLANO.toString() : '-'),
    fecha_aprobacion: props.data_prove || props.DATA_PROVE || props.fecha || '-',
    domicilio: props.domicilio || props.DOMICILIO || '-',
    profesional: props.profesional || props.profesiona || props.PROFESIONA || '-',
    estado: props.estado || props.ESTADO || '-',
    categoria: props.categoria || props.CATEGORIA || '-',
    finca: props.finca || props.FINCA || '-'
  }
}

const PrivateWorks = () => {
  const smp = useSelector((state) => state.parcel.smp)
  const dispatch = useDispatch()

  const [searchType, setSearchType] = useState('catastro')
  const [searchVal, setSearchVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [plans, setPlans] = useState([])
  const [searched, setSearched] = useState(false)

  const searchPlans = async (type, value, isManual = false) => {
    if (!value || value.trim() === '') return
    setLoading(true)
    setError(null)
    setPlans([])
    setSearched(true)

    const cleanedVal = value.trim()
    let apiUrl = ''
    if (type === 'catastro') {
      const numericVal = Number(cleanedVal)
      if (isNaN(numericVal)) {
        setError('El Catastro ingresado debe ser un valor numérico.')
        setLoading(false)
        return
      }
      apiUrl = `${getCustomDbApiUrl()}/api/obras-privadas?catastro=${numericVal}`
    } else {
      apiUrl = `${getCustomDbApiUrl()}/api/obras-privadas?expediente=${encodeURIComponent(cleanedVal)}`
    }

    try {
      const res = await fetch(apiUrl)
      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          const extracted = data.map(f => extractPlanData(f))
          setPlans(extracted)
          
          // If searching manually and plans exist, select the first match's catastro on the map!
          if (isManual && extracted.length > 0) {
            const firstCatastro = extracted[0].catastro
            if (firstCatastro && firstCatastro !== '-') {
              dispatch(basicDataActions.seekerParcel(firstCatastro))
            }
          }
        } else {
          setPlans([])
        }
      } else {
        setError('Error al conectar con el servidor de planos.')
      }
    } catch (err) {
      setError('Error de comunicación con el servidor de planos.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (smp) {
      const hasPlanForSmp = plans.some(p => p.catastro === smp)
      if (searchType === 'expediente' && hasPlanForSmp) {
        return
      }

      const numericSmp = Number(smp)
      if (!isNaN(numericSmp)) {
        setSearchType('catastro')
        setSearchVal(smp)
        searchPlans('catastro', smp, false)
      } else {
        setSearchVal(smp)
        setPlans([])
        setSearched(false)
      }
    }
  }, [smp])

  const handleSearch = async (e) => {
    e.preventDefault()
    const cleanedVal = searchVal.trim()
    if (!cleanedVal) return

    if (searchType === 'catastro') {
      const numericVal = Number(cleanedVal)
      if (isNaN(numericVal)) {
        setError('El Catastro ingresado debe ser un valor numérico.')
        return
      }
      setLoading(true)
      setError(null)
      setPlans([])
      setSearched(true)
      try {
        const actionResult = await dispatch(basicDataActions.seekerParcel(cleanedVal))
        if (basicDataActions.seekerParcel.rejected.match(actionResult)) {
          setError('El Catastro ingresado no existe en el sistema catastral.')
          setLoading(false)
        }
      } catch (err) {
        setError('El Catastro ingresado no existe en el sistema catastral.')
        setLoading(false)
      }
    } else {
      searchPlans(searchType, searchVal, true)
    }
  }

  const handleClear = () => {
    setSearchVal('')
    setPlans([])
    setSearched(false)
    setError(null)
  }

  return (
    <ContainerBar type="table">
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="h6" color="primary" sx={{ ...decorators.bold }}>
            Obras Privadas
          </Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Búsqueda de planos aprobados y estado de expedientes de obras.
        </Typography>

        <Box component="form" onSubmit={handleSearch} sx={{ mb: 4, p: 2, bgcolor: '#f4f6f6', borderRadius: '4px' }}>
          <FormControl component="fieldset" sx={{ mb: 2, display: 'block' }}>
            <RadioGroup
              row
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              name="search-type-group"
            >
              <FormControlLabel value="catastro" control={<Radio color="primary" />} label="Buscar por Catastro" />
              <FormControlLabel value="expediente" control={<Radio color="primary" />} label="Buscar por Expediente" />
            </RadioGroup>
          </FormControl>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                label={searchType === 'catastro' ? 'Nomenclatura Catastral (Número)' : 'Número de Expediente'}
                placeholder={searchType === 'catastro' ? 'Ej: 10811' : 'Ej: 15958-SG-22'}
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4} sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                type="submit"
                startIcon={<SearchIcon />}
                sx={{ bgcolor: '#f96332', '&:hover': { bgcolor: '#e05326' } }}
              >
                Buscar
              </Button>
              <Button
                variant="outlined"
                onClick={handleClear}
                sx={{ minWidth: 'auto' }}
              >
                <ClearIcon />
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress color="primary" />
            </Box>
          )}

          {error && (
            <Box sx={{ p: 2, bgcolor: '#fdf2f2', borderRadius: '4px', borderLeft: '4px solid #f05252', mb: 2 }}>
              <Typography color="error" variant="body2">{error}</Typography>
            </Box>
          )}

          {!loading && !error && plans.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {plans.map((plan, idx) => (
                <Card key={idx} variant="outlined" sx={{ borderLeft: '4px solid #f96332', boxShadow: 1 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FolderSpecialIcon color="primary" sx={{ fontSize: 20 }} />
                        <Typography variant="subtitle2" sx={{ ...decorators.bold, fontStyle: 'italic' }}>
                          Planos Aprobados
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => buildPrivateWorksPDF([plan], smp, searchVal, searchType)}
                        sx={{
                          borderColor: '#f96332',
                          color: '#f96332',
                          fontSize: '11px',
                          py: 0.5,
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: '#e05326',
                            bgcolor: 'rgba(249, 99, 50, 0.04)'
                          }
                        }}
                      >
                        Generar PDF
                      </Button>
                    </Box>
                    <Divider sx={{ mb: 1.5 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary" display="block">Expediente N°</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{plan.expediente}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary" display="block">Catastro</Typography>
                        <Typography variant="body2">{plan.catastro}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary" display="block">Plano N°</Typography>
                        <Typography variant="body2">{plan.plano}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary" display="block">Fecha de aprobación</Typography>
                        <Typography variant="body2">{plan.fecha_aprobacion}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary" display="block">Estado</Typography>
                        <Typography variant="body2">{plan.estado}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary" display="block">Categoría</Typography>
                        <Typography variant="body2">{plan.categoria}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary" display="block">Domicilio</Typography>
                        <Typography variant="body2">{plan.domicilio}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary" display="block">Profesional</Typography>
                        <Typography variant="body2">{plan.profesional}</Typography>
                      </Grid>
                      {plan.finca && plan.finca !== '-' && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="textSecondary" display="block">Finca</Typography>
                          <Typography variant="body2">{plan.finca}</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {!loading && !error && plans.length === 0 && searched && (
            <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8f9fa', borderRadius: '4px' }}>
              <Typography variant="body2" color="textSecondary">
                No se encontraron planos aprobados registrados para la búsqueda ingresada.
              </Typography>
            </Box>
          )}

          {!loading && !error && plans.length === 0 && !searched && (
            <Box>
              {!smp ? (
                <SelectParcel />
              ) : (
                <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8f9fa', borderRadius: '4px' }}>
                  <Typography variant="body2" color="textSecondary">
                    La parcela catastral seleccionada no posee planos aprobados registrados en el sistema.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </ContainerBar>
  )
}

export default PrivateWorks
