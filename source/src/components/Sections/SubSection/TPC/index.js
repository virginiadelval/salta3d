import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Grid,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material'
import ContainerBar from 'components/Sections/ContainerBar'
import SelectParcel from 'components/Sections/SubSection/SelectParcel'
import { useSelector, useDispatch } from 'react-redux'
import decorators from 'theme/fontsDecorators'
import { getCustomDbApiUrl } from 'utils/configQueries'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CalculateIcon from '@mui/icons-material/Calculate'

const TPC = () => {
  const smp = useSelector((state) => state.parcel.smp)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [referenceData, setReferenceData] = useState([])
  
  // Emisor state
  const [emisorZone, setEmisorZone] = useState(null)
  const [emisorArea, setEmisorArea] = useState(0)
  const [emisorIncidencia, setEmisorIncidencia] = useState(0)
  
  // Receptor state (user inputs)
  const [receptorZone, setReceptorZone] = useState('')
  const [receptorReqArea, setReceptorReqArea] = useState('')
  
  // Results
  const [results, setResults] = useState(null)

  // Fetch reference values on mount
  useEffect(() => {
    const fetchTpcValores = async () => {
      try {
        const res = await fetch(`${getCustomDbApiUrl()}/api/tpc-valores`)
        if (res.ok) {
          const data = await res.json()
          setReferenceData(data)
        } else {
          console.error('Error fetching TPC reference values')
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchTpcValores()
  }, [])

  // When smp changes, fetch emisor info
  useEffect(() => {
    const fetchEmisorData = async () => {
      if (!smp) {
        resetState()
        return
      }
      
      setLoading(true)
      setError(null)
      resetState()
      
      try {
        // 1. Get Lat/Lng
        const districtRes = await fetch(`https://geocloud.municipalidadsalta.gob.ar/getQ_CatastrosGis/${smp}`)
        let lat = null, lng = null
        if (districtRes.ok) {
          const districtData = await districtRes.json()
          if (districtData && districtData.length > 0) {
            lat = districtData[0].latitud
            lng = districtData[0].longitud
          }
        }
        
        if (!lat || !lng) {
          setError('No se pudo determinar la ubicación de la parcela.')
          setLoading(false)
          return
        }

        // 2. Get Area
        let area = 0
        const catCql = `CATASTRO = ${smp} OR CATASTRO = '${smp}'`
        const catWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=public:catastros_Ene2025&outputFormat=application/json&cql_filter=${encodeURIComponent(catCql)}`
        const catRes = await fetch(catWfsUrl)
        if (catRes.ok) {
          const catData = await catRes.json()
          if (catData && catData.features && catData.features.length > 0) {
            area = catData.features[0].properties.SHAPE_Area || 0
          }
        }

        // 3. Get Zona
        let zonaCpua = null
        const zoningCql = `INTERSECTS(geom, POINT(${lng} ${lat}))`
        const zoningWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=private:valores_del_suelo_enero_2025&outputFormat=application/json&cql_filter=${encodeURIComponent(zoningCql)}`
        const zoningRes = await fetch(zoningWfsUrl)
        if (zoningRes.ok) {
          const zoningData = await zoningRes.json()
          if (zoningData && zoningData.features && zoningData.features.length > 0) {
            zonaCpua = parseInt(zoningData.features[0].properties['Zona'], 10)
          }
        }
        
        if (!zonaCpua) {
          setError('La parcela seleccionada no se ubica dentro de un distrito catalogado (sin valor de zona).')
          setLoading(false)
          return
        }

        setEmisorZone(zonaCpua)
        setEmisorArea(Math.round(area))

      } catch (err) {
        console.error(err)
        setError('Ocurrió un error al consultar la información de la parcela.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchEmisorData()
  }, [smp])

  // Update emisor incidencia when reference data or emisor zone changes
  useEffect(() => {
    if (emisorZone !== null && referenceData.length > 0) {
      const ref = referenceData.find(r => Number(r.zona) === Number(emisorZone))
      if (ref && ref.fot_privado && Number(ref.fot_privado) > 0) {
        const incidencia = Number(ref.valor_suelo_min) / Number(ref.fot_privado)
        setEmisorIncidencia(incidencia)
      } else {
        setEmisorIncidencia(0)
      }
    }
  }, [emisorZone, referenceData])

  const resetState = () => {
    setEmisorZone(null)
    setEmisorArea(0)
    setEmisorIncidencia(0)
    setReceptorZone('')
    setReceptorReqArea('')
    setResults(null)
  }

  const handleCalculate = () => {
    if (!emisorZone || !emisorIncidencia || emisorIncidencia === 0) {
      setError('El catastro seleccionado no es válido como Emisor o no tiene valores de incidencia.')
      return
    }
    if (!receptorZone || !receptorReqArea) return

    const emisorRef = referenceData.find(r => Number(r.zona) === Number(emisorZone))
    const receptorRef = referenceData.find(r => Number(r.zona) === Number(receptorZone))

    if (!receptorRef || !receptorRef.fot_privado || Number(receptorRef.fot_privado) === 0) {
      setError('La zona receptora seleccionada no posee valores válidos.')
      return
    }

    const recIncidencia = Number(receptorRef.valor_suelo_min) / Number(receptorRef.fot_privado)
    const fee = emisorIncidencia / recIncidencia
    
    const reqArea = Number(receptorReqArea)
    const supEmisoraTransferir = reqArea / fee
    const m2Sobrantes = emisorArea - supEmisoraTransferir
    const valorTransaccion = supEmisoraTransferir * emisorIncidencia

    setResults({
      recIncidencia,
      fee,
      supEmisoraTransferir,
      m2Sobrantes,
      valorTransaccion,
      valorMin: valorTransaccion * 0.8,
      valorMax: valorTransaccion * 1.2
    })
    setError(null)
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  return (
    <ContainerBar type="table">
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="h6" color="primary" sx={{ ...decorators.bold }}>
            Simulador TPC
          </Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Transferencia del Potencial Constructivo
        </Typography>

        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {!smp ? (
            <SelectParcel />
          ) : (
            <Box>
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

              {!loading && emisorZone !== null && (
                <Box>
                  <Card variant="outlined" sx={{ mb: 3, borderLeft: '4px solid #f96332' }}>
                    <CardContent sx={{ p: 2, pb: '16px !important' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ ...decorators.bold }}>
                          Datos del Catastro Emisor
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 1.5 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary" display="block">Zona de Incidencia (Nro CPUA)</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{emisorZone}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary" display="block">Superficie Total (m²)</Typography>
                          <Typography variant="body2">{emisorArea}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="caption" color="textSecondary" display="block">Incidencia Emisor (USD/m²)</Typography>
                          <Typography variant="body2" color={emisorIncidencia === 0 ? 'error' : 'textPrimary'}>
                            {emisorIncidencia === 0 ? 'Sin valores de referencia' : formatCurrency(emisorIncidencia)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  <Typography variant="subtitle2" sx={{ ...decorators.bold, mb: 1 }}>
                    Simulación de Transferencia
                  </Typography>

                  <Box sx={{ mb: 3, p: 2, bgcolor: '#f4f6f6', borderRadius: '4px' }}>
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel>Zona Receptora</InputLabel>
                      <Select
                        value={receptorZone}
                        label="Zona Receptora"
                        onChange={(e) => {
                          setReceptorZone(e.target.value)
                          setResults(null)
                        }}
                      >
                        {referenceData.map((ref) => (
                          <MenuItem key={ref.zona} value={ref.zona}>
                            Zona {ref.zona}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      variant="outlined"
                      label="Superficie Receptora Requerida (m²)"
                      value={receptorReqArea}
                      onChange={(e) => {
                        setReceptorReqArea(e.target.value)
                        setResults(null)
                      }}
                      sx={{ mb: 2 }}
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<CalculateIcon />}
                      onClick={handleCalculate}
                      disabled={!receptorZone || !receptorReqArea || emisorIncidencia === 0}
                      sx={{ bgcolor: '#f96332', '&:hover': { bgcolor: '#e05326' } }}
                    >
                      Calcular TPC
                    </Button>
                  </Box>

                  {results && (
                    <Card variant="outlined" sx={{ mb: 3, borderLeft: '4px solid #4caf50' }}>
                      <CardContent sx={{ p: 2, pb: '16px !important' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <SwapHorizIcon color="success" />
                          <Typography variant="subtitle2" sx={{ ...decorators.bold }}>
                            Resultados del Simulador
                          </Typography>
                        </Box>
                        <Divider sx={{ mb: 1.5 }} />
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="caption" color="textSecondary" display="block">Factor de Equivalencia Económica (FEE)</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{results.fee.toFixed(2)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary" display="block">Superficie Emisora a Transferir</Typography>
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>{Math.round(results.supEmisoraTransferir)} m²</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary" display="block">M² Sobrantes en Emisor</Typography>
                            <Typography variant="body2">{Math.round(results.m2Sobrantes)} m²</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="caption" color="textSecondary" display="block">Valor Económico de la Transferencia</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#333' }}>
                              {formatCurrency(results.valorTransaccion)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary" display="block">Valor Mínimo Referencial (-20%)</Typography>
                            <Typography variant="body2" color="textSecondary">{formatCurrency(results.valorMin)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary" display="block">Valor Máximo Referencial (+20%)</Typography>
                            <Typography variant="body2" color="textSecondary">{formatCurrency(results.valorMax)}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </ContainerBar>
  )
}

export default TPC
