import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Box,
  Typography,
  Switch,
  Slider,
  FormControlLabel,
  Button,
  IconButton,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import ApartmentIcon from '@mui/icons-material/Apartment'
import CloseIcon from '@mui/icons-material/Close'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SettingsIcon from '@mui/icons-material/Settings'
import { useSelector } from 'react-redux'
import debounce from 'lodash.debounce'
import MapaInteractivoGL from 'utils/MapaInteractivoGL'
import styles from './styles'

const FIXED_BUILDING_COLOR = '#828385' // Modern sleek gray
const ACCENT_COLOR = '#022A47' // Deep corporate blue

const Buildings3D = () => {
  const isMapReady = useSelector((state) => state.map.isMapReady)
  const mapGL = MapaInteractivoGL()

  // UI state
  const [isOpen, setIsOpen] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  const [useLocalGeojson, setUseLocalGeojson] = useState(false)
  const [opacity, setOpacity] = useState(0.8)
  const [metersPerFloor, setMetersPerFloor] = useState(3.5)
  const [heightProp, setHeightProp] = useState('PLANTAS')
  const [fileName, setFileName] = useState('')
  const [geojsonFeatures, setGeojsonFeatures] = useState(null)
  const [zoomMessage, setZoomMessage] = useState('')
  const [controlGroupEl, setControlGroupEl] = useState(null)

  // Derived sourceType
  const sourceType = useLocalGeojson ? 'geojson' : 'wfs'

  // Refs for map listener updates
  const mapRef = useRef(null)
  const isEnabledRef = useRef(isEnabled)
  const sourceTypeRef = useRef(sourceType)
  const geojsonFeaturesRef = useRef(geojsonFeatures)

  // Sync refs
  useEffect(() => {
    isEnabledRef.current = isEnabled
    sourceTypeRef.current = sourceType
    geojsonFeaturesRef.current = geojsonFeatures
  }, [isEnabled, sourceType, geojsonFeatures])

  // Locate the Maplibre control group box and retry if not immediately in DOM
  useEffect(() => {
    if (!isMapReady) return

    let timer
    const findContainer = () => {
      const el = document.querySelector(
        '.maplibregl-ctrl-top-right .maplibregl-ctrl-group'
      )
      if (el) {
        setControlGroupEl(el)
      } else {
        timer = setTimeout(findContainer, 100)
      }
    }

    findContainer()

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isMapReady])

  // Helper to remove layers/sources safely
  const removeBuildingsLayers = useCallback((map) => {
    if (!map) return

    if (map.getLayer('salta-buildings-layer')) {
      map.removeLayer('salta-buildings-layer')
    }
    if (map.getSource('salta-buildings-source')) {
      map.removeSource('salta-buildings-source')
    }
  }, [])

  // Dynamic WFS fetching (using WFS 1.0.0 for standard xmin,ymin,xmax,ymax axis order)
  const fetchWFSBuildings = useCallback(async (map) => {
    if (!map || !isEnabledRef.current || sourceTypeRef.current !== 'wfs') return

    const zoom = map.getZoom()
    if (zoom < 15) {
      setZoomMessage('Acércate más para ver las edificaciones (Zoom >= 15)')
      const source = map.getSource('salta-buildings-source')
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] })
      }
      return
    }

    setZoomMessage('')
    const bounds = map.getBounds()
    const bbox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ].join(',')

    // Version 1.0.0 is used to match xmin,ymin,xmax,ymax coordinate bounds exactly
    const url = `https://geocloud.municipalidadsalta.gob.ar/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=public:edificacion_catastro_zona&outputFormat=application/json&srsName=EPSG:4326&bbox=${bbox}`

    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('WFS request failed')
      const data = await response.json()

      // Ensure user hasn't toggled options during fetch
      if (isEnabledRef.current && sourceTypeRef.current === 'wfs') {
        const source = map.getSource('salta-buildings-source')
        if (source) {
          source.setData(data)
        }
      }
    } catch (error) {
      console.error('Error cargando edificaciones de Geoserver Salta:', error)
    }
  }, [])

  // Debounced WFS fetch
  const debouncedFetchWFS = useRef(
    debounce((map) => {
      fetchWFSBuildings(map)
    }, 300)
  ).current

  // 1. Initial setup of layers and sources (avoids recreating on sliders change)
  useEffect(() => {
    if (!isMapReady || !mapGL || !mapGL.map) return
    const map = mapGL.map
    mapRef.current = map

    const handleMoveEnd = () => {
      if (isEnabledRef.current && sourceTypeRef.current === 'wfs') {
        debouncedFetchWFS(map)
      }
    }

    map.on('moveend', handleMoveEnd)
    map.on('zoomend', handleMoveEnd)

    // Add source if not present
    if (!map.getSource('salta-buildings-source')) {
      map.addSource('salta-buildings-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })
    }

    // Add layer if not present
    if (!map.getLayer('salta-buildings-layer')) {
      const heightExpr =
        sourceTypeRef.current === 'wfs'
          ? [
              '*',
              [
                'coalesce',
                ['to-number', ['get', 'PLANTAS']],
                ['to-number', ['get', 'plantas']],
                1
              ],
              metersPerFloor
            ]
          : [
              '*',
              [
                'coalesce',
                ['to-number', ['get', heightProp]],
                ['to-number', ['get', 'altura']],
                ['to-number', ['get', 'height']],
                ['to-number', ['get', 'PLANTAS']],
                ['to-number', ['get', 'plantas']],
                4
              ],
              metersPerFloor
            ]

      map.addLayer({
        id: 'salta-buildings-layer',
        source: 'salta-buildings-source',
        type: 'fill-extrusion',
        layout: {
          visibility: isEnabledRef.current ? 'visible' : 'none'
        },
        paint: {
          'fill-extrusion-color': FIXED_BUILDING_COLOR,
          'fill-extrusion-opacity': opacity,
          'fill-extrusion-height': heightExpr,
          'fill-extrusion-base': 0
        }
      })
    }

    // Tilt camera initially
    if (isEnabledRef.current) {
      map.easeTo({ pitch: 60, duration: 800 })
    }

    // Fetch initial WFS
    if (sourceTypeRef.current === 'wfs') {
      fetchWFSBuildings(map)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('moveend', handleMoveEnd)
        mapRef.current.off('zoomend', handleMoveEnd)
        removeBuildingsLayers(mapRef.current)
      }
    }
  }, [isMapReady])

  // 2. React to isEnabled switches (sets layer visibility and tilts camera directly)
  useEffect(() => {
    if (!isMapReady || !mapGL || !mapGL.map) return
    const map = mapGL.map

    if (map.getLayer('salta-buildings-layer')) {
      map.setLayoutProperty(
        'salta-buildings-layer',
        'visibility',
        isEnabled ? 'visible' : 'none'
      )
    }

    if (isEnabled && sourceType === 'wfs') {
      fetchWFSBuildings(map)
    }
  }, [isEnabled, isMapReady, sourceType, fetchWFSBuildings])

  // 3. React to Source changes (updates GeoJSON source data without recreating layer)
  useEffect(() => {
    if (!isMapReady || !mapGL || !mapGL.map) return
    const map = mapGL.map
    const source = map.getSource('salta-buildings-source')

    if (source) {
      if (sourceType === 'geojson' && geojsonFeatures) {
        source.setData(geojsonFeatures)
        setZoomMessage('')
      } else if (sourceType === 'wfs') {
        source.setData({ type: 'FeatureCollection', features: [] })
        fetchWFSBuildings(map)
      } else {
        source.setData({ type: 'FeatureCollection', features: [] })
      }
    }
  }, [sourceType, geojsonFeatures, isMapReady, fetchWFSBuildings])

  // 4. React to paint properties (Slider / Textfield updates call setPaintProperty instantly)
  useEffect(() => {
    if (!isMapReady || !mapGL || !mapGL.map) return
    const map = mapGL.map

    if (map.getLayer('salta-buildings-layer')) {
      const heightExpr =
        sourceType === 'wfs'
          ? [
              '*',
              [
                'coalesce',
                ['to-number', ['get', 'PLANTAS']],
                ['to-number', ['get', 'plantas']],
                1
              ],
              metersPerFloor
            ]
          : [
              '*',
              [
                'coalesce',
                ['to-number', ['get', heightProp]],
                ['to-number', ['get', 'altura']],
                ['to-number', ['get', 'height']],
                ['to-number', ['get', 'PLANTAS']],
                ['to-number', ['get', 'plantas']],
                4
              ],
              metersPerFloor
            ]

      map.setPaintProperty(
        'salta-buildings-layer',
        'fill-extrusion-height',
        heightExpr
      )
      map.setPaintProperty(
        'salta-buildings-layer',
        'fill-extrusion-opacity',
        opacity
      )
    }
  }, [isMapReady, opacity, metersPerFloor, heightProp, sourceType])

  // Handle local GeoJSON upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const geojson = JSON.parse(e.target.result)
        setGeojsonFeatures(geojson)

        // Auto-detect property if possible
        if (geojson.features && geojson.features.length > 0) {
          const firstProps = geojson.features[0].properties
          if (firstProps) {
            const keys = Object.keys(firstProps)
            const commonKeys = [
              'PLANTAS',
              'altura',
              'height',
              'altura_fin',
              'levels'
            ]
            const foundKey = keys.find(
              (k) =>
                commonKeys.includes(k) ||
                k.toLowerCase().includes('alt') ||
                k.toLowerCase().includes('height')
            )
            if (foundKey) {
              setHeightProp(foundKey)
            }
          }
        }
      } catch (err) {
        console.error('Error parsing uploaded GeoJSON:', err)
        alert(
          'Error al leer el archivo GeoJSON. Asegúrate de que sea un formato JSON válido.'
        )
      }
    }
    reader.readAsText(file)
  }

  // Toggle switch handler with direct map camera tilting
  const handleToggle3D = (checked) => {
    setIsEnabled(checked)
    if (mapGL && mapGL.map) {
      mapGL.map.easeTo({
        pitch: checked ? 60 : 0,
        duration: 800
      })
    }
  }

  if (!isMapReady) return null

  return (
    <>
      {/* Icon button rendered into Maplibre's control group via Portal */}
      {controlGroupEl &&
        createPortal(
          <button
            style={{
              width: '29px',
              height: '29px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottomLeftRadius: '4px',
              borderBottomRightRadius: '4px',
              color: isOpen || isEnabled ? ACCENT_COLOR : '#707070',
              backgroundColor: isOpen ? '#f5f5f5' : '#ffffff',
              cursor: 'pointer',
              border: 'none',
              outline: 'none',
              padding: 0
            }}
            onClick={() => setIsOpen(!isOpen)}
            title="Edificaciones 3D"
          >
            <ApartmentIcon style={{ fontSize: '18px' }} />
          </button>,
          controlGroupEl
        )}

      {/* Settings Panel */}
      {isOpen && (
        <Box sx={styles.panel}>
          <Box sx={styles.header}>
            <Box display="flex" alignItems="center" gap={1}>
              <ApartmentIcon sx={{ color: ACCENT_COLOR }} />
              <Typography sx={styles.title}>Edificaciones 3D</Typography>
            </Box>
            <IconButton size="small" onClick={() => setIsOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Activar/Desactivar */}
          <FormControlLabel
            control={
              <Switch
                checked={isEnabled}
                onChange={(e) => handleToggle3D(e.target.checked)}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: ACCENT_COLOR,
                    '& + .MuiSwitch-track': {
                      backgroundColor: ACCENT_COLOR
                    }
                  }
                }}
              />
            }
            label={
              <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>
                Mostrar edificaciones 3D
              </Typography>
            }
          />

          {isEnabled && (
            <>
              {/* Toggle switch para GeoJSON Local (Salta WFS queda por defecto detrás de escena) */}
              <FormControlLabel
                control={
                  <Switch
                    checked={useLocalGeojson}
                    onChange={(e) => setUseLocalGeojson(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: ACCENT_COLOR,
                        '& + .MuiSwitch-track': {
                          backgroundColor: ACCENT_COLOR
                        }
                      }
                    }}
                  />
                }
                label={
                  <Typography sx={styles.label}>
                    Cargar GeoJSON Local
                  </Typography>
                }
                sx={{ mt: 0.5 }}
              />

              {/* Zoom warning message */}
              {zoomMessage && !useLocalGeojson && (
                <Typography
                  sx={{
                    fontSize: '10.5px',
                    color: '#d32f2f',
                    backgroundColor: 'rgba(211, 47, 47, 0.08)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    lineHeight: 1.2
                  }}
                >
                  {zoomMessage}
                </Typography>
              )}

              {/* Upload local GeoJSON */}
              {useLocalGeojson && (
                <Box sx={styles.controlGroup}>
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    sx={styles.actionButton}
                    fullWidth
                  >
                    Subir GeoJSON
                    <input
                      type="file"
                      accept=".geojson,.json"
                      hidden
                      onChange={handleFileUpload}
                    />
                  </Button>
                  {fileName && (
                    <Typography
                      sx={{
                        fontSize: '10.5px',
                        color: '#666',
                        fontStyle: 'italic',
                        mt: 0.5
                      }}
                    >
                      Cargado: {fileName}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Advanced Customization (Without color presets) */}
              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  backgroundColor: 'transparent',
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <ExpandMoreIcon
                      sx={{ fontSize: 18, color: ACCENT_COLOR }}
                    />
                  }
                  sx={{
                    padding: 0,
                    minHeight: 0,
                    '& .MuiAccordionSummary-content': { margin: '8px 0 0 0' }
                  }}
                >
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <SettingsIcon sx={{ fontSize: '14px', color: '#666' }} />
                    <Typography sx={styles.sectionTitle}>
                      Avanzado / Apariencia
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails
                  sx={{
                    padding: '8px 0 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5
                  }}
                >
                  {/* Opacity */}
                  <Box sx={styles.controlGroup}>
                    <Typography sx={styles.label}>
                      Opacidad: {Math.round(opacity * 100)}%
                    </Typography>
                    <Slider
                      value={opacity}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      onChange={(e, val) => setOpacity(val)}
                      size="small"
                      sx={{ color: ACCENT_COLOR }}
                    />
                  </Box>

                  {/* Height Multipliers */}
                  {sourceType !== 'wfs' && (
                    <Box sx={styles.controlGroup}>
                      {useLocalGeojson && (
                        <Box sx={{ mb: 1.5 }}>
                          <TextField
                            label="Propiedad de altura"
                            value={heightProp}
                            onChange={(e) => setHeightProp(e.target.value)}
                            size="small"
                            variant="outlined"
                            fullWidth
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                fontSize: '11.5px',
                                '&.Mui-focused fieldset': {
                                  borderColor: ACCENT_COLOR
                                }
                              },
                              '& .MuiInputLabel-root': {
                                fontSize: '12px',
                                '&.Mui-focused': {
                                  color: ACCENT_COLOR
                                }
                              }
                            }}
                          />
                        </Box>
                      )}

                      <Typography sx={styles.label}>
                        Multiplicador / Altura por nivel: {metersPerFloor}m
                      </Typography>
                      <Slider
                        value={metersPerFloor}
                        min={1.5}
                        max={8}
                        step={0.5}
                        onChange={(e, val) => setMetersPerFloor(val)}
                        size="small"
                        sx={{ color: ACCENT_COLOR }}
                      />
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </Box>
      )}
    </>
  )
}

export default Buildings3D
