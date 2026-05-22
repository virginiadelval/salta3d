import React, { useEffect, useState, useCallback } from 'react'
import { renderToString } from 'react-dom/server'

import { Box, Typography } from '@mui/material'

import { useDispatch, useSelector } from 'react-redux'
import { actions as mapActions } from 'state/ducks/map'
import { actions as seekerActions } from 'state/ducks/seeker'

import { getApiUrl, getFullLayerConfigByIdLayer } from 'utils/configQueries'
import { fetchWmsGetFeatureInfo } from 'utils/wmsLayerManager'

import MapaInteractivoGL from 'utils/MapaInteractivoGL'

import Seeker from 'components/Seeker/OldSeeker'

import FeatureInfo from 'components/FeatureInfo/FeatureInfo'
import Measure from 'components/Measure'
import DimensionBtn from 'components/DimensionBtn'
import VolumenButton from 'components/VolumeButton'

import decorators from 'theme/fontsDecorators'

import imgCapaBasePrincipal from 'img/capabase_1.png'
import imgCapaBaseSecundaria from 'img/capabase_2.png'

import PropTypes from 'prop-types'
import styles from './styles'

const MinimapOption = ({ imageUrl, text, children, ...otherProps }) => {
  return (
    <>
      <Box
        data-tour="minimap"
        sx={styles.minimapLayer}
        style={{
          backgroundImage: imageUrl
        }}
        {...otherProps}
      >
        <Typography
          variant="caption"
          sx={[decorators.bold, decorators.white, styles.minimapTitleContainer]}
        >
          {text}
        </Typography>
      </Box>
      {children}
    </>
  )
}
// background-color: rgba(0, 0, 0, 0.5);
//     color: white;
const transformRequest = (url, resourceType) => {
  const token = '7b3ea1f12563ee390a13ab885884e4590cf6de26'
  if (resourceType === 'Tile' && url.endsWith('pbf')) {
    return {
      url,
      headers: { Authorization: `Token ${token}` }
      // credentials: 'include'  // Include cookies for cross-origin requests
    }
  }
  return { url }
}

const Map = ({ children }) => {
  const isMapReady = useSelector((state) => state.map.isMapReady)
  const cameraLat = useSelector((state) => state.map.camera?.lat)
  const cameraLng = useSelector((state) => state.map.camera?.lng)
  const cameraZoom = useSelector((state) => state.map.camera?.zoom)
  const cameraPitch = useSelector((state) => state.map.camera?.pitch)
  const cameraBearing = useSelector((state) => state.map.camera?.bearing)

  const [mapGL, setMapGL] = useState(null)

  const dispatch = useDispatch()
  const [capabasePrincipal, setCapabasePrincipal] = useState(true)

  useEffect(() => {
    if (isMapReady && cameraLat) {
      mapGL.map.flyTo({
        center: [cameraLng, cameraLat],
        zoom: cameraZoom,
        pitch: cameraPitch,
        bearing: cameraBearing
      })
    } else if (isMapReady) {
      mapGL.map.flyTo({
        pitch: cameraPitch
      })
    }
  }, [
    isMapReady,
    mapGL,
    cameraLat,
    cameraLng,
    cameraZoom,
    cameraBearing,
    cameraPitch
  ])

  const onFeatureClick = (mapInstance, lngLat, feature) => {
    const {
      properties: { Id: featId },
      layer: { id: idLayer }
    } = feature

    const fields = JSON.parse(getFullLayerConfigByIdLayer(idLayer).popupContent)

    mapInstance
      .getFeatureProps(featId, fields)
      .then((res) => res.json())
      .then((data) => {
        const { contenido, direccionNormalizada } = data

        const contenidoMostrar =
          fields?.length > 0
            ? contenido.filter(({ nombreId }) => fields.includes(nombreId))
            : contenido

        const featureInfoString = renderToString(
          <FeatureInfo
            contenido={contenidoMostrar}
            direccionNormalizada={direccionNormalizada}
          />
        )
        mapInstance.addPopup(lngLat, featureInfoString)
      })
  }

  const onClicked = useCallback(
    ({ lng, lat }) => {
      const coord = { lng, lat }
      dispatch(mapActions.clickOnMap(coord))
    },
    [dispatch]
  )

  useEffect(() => {
    if (
      isMapReady &&
      mapGL.isVisibleBaseLayerPrincipal() === capabasePrincipal
    ) {
      mapGL.toggleBaseLayer()
    }
  }, [capabasePrincipal, mapGL, isMapReady])

  const selectedCoords = useSelector((state) => state.map.selectedCoords)
  const wmsLayers = useSelector((state) => state.map.wmsLayers)

  useEffect(() => {
    if (!isMapReady || !mapGL || !selectedCoords) return

    const activeWmsWithInfo = wmsLayers.filter(
      (l) => l.visible && l.getFeatureInfo
    )

    if (activeWmsWithInfo.length === 0) return

    const fetchAllWmsInfo = async () => {
      try {
        const results = await Promise.all(
          activeWmsWithInfo.map(async (layer) => {
            try {
              const res = await fetchWmsGetFeatureInfo(
                mapGL.map,
                selectedCoords,
                layer
              )
              return { layer, res }
            } catch (err) {
              console.error(`Error querying WMS layer ${layer.name}:`, err)
              return { layer, res: null }
            }
          })
        )

        const validResults = results.filter(({ res }) => res && res.data)
        if (validResults.length === 0) return

        const popupContentHtml = renderToString(
          <div style={{ fontFamily: 'sans-serif', padding: '8px', maxWidth: '300px', maxHeight: '250px', overflowY: 'auto' }}>
            {validResults.map(({ layer, res }, idx) => {
              let details = null

              if (res.format === 'json') {
                const features = res.data.features || []
                if (features.length > 0) {
                  details = (
                    <div>
                      {features.map((f, fIdx) => (
                        <div key={fIdx} style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: fIdx < features.length - 1 ? '1px dashed #ddd' : 'none' }}>
                          {Object.entries(f.properties || {}).map(([key, val]) => (
                            <div key={key} style={{ fontSize: '10px', margin: '2px 0', wordBreak: 'break-all' }}>
                              <strong>{key}:</strong> {String(val)}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                } else {
                  details = <div style={{ fontSize: '10px', color: '#777' }}>No se encontraron elementos.</div>
                }
              } else if (res.format === 'html' || res.format === 'text') {
                const cleanHtml = res.data
                  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                  .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                  .replace(/<html>|<\/html>|<body>|<\/body>|<head>|<\/head>/gi, '')
                  .trim()

                if (cleanHtml) {
                  details = <div style={{ fontSize: '10px' }} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
                } else {
                  details = <div style={{ fontSize: '10px', color: '#777' }}>No se encontraron elementos.</div>
                }
              }

              return (
                <div key={layer.id} style={{ marginBottom: idx < validResults.length - 1 ? '12px' : '0', paddingBottom: idx < validResults.length - 1 ? '12px' : '0', borderBottom: idx < validResults.length - 1 ? '1px solid #ccc' : 'none' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
                    {layer.name}
                  </div>
                  {details}
                </div>
              )
            })}
          </div>
        )

        mapGL.addPopup(selectedCoords, popupContentHtml)
      } catch (err) {
        console.error('Error getting WMS features info:', err)
      }
    }

    fetchAllWmsInfo()
  }, [selectedCoords, wmsLayers, mapGL, isMapReady])

  const defaultMapStyle = useSelector((state) => state.map.defaultMapStyle)

  useEffect(() => {
    dispatch(mapActions.loadLayers())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Se inicializa el mapa
  useEffect(() => {
    if (!isMapReady && defaultMapStyle !== null && cameraLat) {
      const map = MapaInteractivoGL({
        params: {
          center: [cameraLng, cameraLat],
          zoom: cameraZoom,
          style: defaultMapStyle
        },
        onFeatureClick,
        transformRequest,
        onClicked,
        onMoveEnd: () => {
          const { lng, lat } = map.map.getCenter()
          const bearing = map.map.getBearing()
          const pitch = map.map.getPitch()
          const zoom = map.map.getZoom()
          dispatch(
            mapActions.cameraUpdated({
              lat,
              lng,
              zoom,
              bearing,
              pitch
            })
          )
        },
        apiUrl: getApiUrl()
      })
      setMapGL(map)

      const engine = map.getMapEngine()
      const control = new engine.NavigationControl()
      map.map.addControl(control)
      dispatch(mapActions.initMap(map))
    }
  }, [
    isMapReady,
    defaultMapStyle,
    cameraLat,
    cameraLng,
    cameraZoom,
    onClicked,
    dispatch
  ])

  return (
    <>
      <Box id="map" sx={styles.container}>
        <Box sx={styles.bottomMenu}>
          <MinimapOption
            imageUrl={`url(${
              capabasePrincipal ? imgCapaBaseSecundaria : imgCapaBasePrincipal
            })`}
            onClick={() => setCapabasePrincipal(!capabasePrincipal)}
            text={capabasePrincipal ? 'SATÉLITE' : 'MAPA'}
          />
        </Box>
        <Measure />
        <DimensionBtn />
        <VolumenButton />
        {isMapReady && children}
      </Box>
      <Box sx={styles.topMenu}>
        <Seeker
          onSelectItem={(selectedSuggestion) => {
            dispatch(seekerActions.placeSelected({ data: { smp: null } }))
            dispatch(seekerActions.placeSelected(selectedSuggestion))
            dispatch(
              seekerActions.coordinatesSelected(
                selectedSuggestion.data.coordenadas
              )
            )
            /*
            Se actualiza la camara desde acá
            ya que al elegir lugares o intersecciones
            el autocompleter no trae SMP
           */
            if (
              (selectedSuggestion.data.smp === undefined ||
                selectedSuggestion.data.smp === '') &&
              selectedSuggestion.data.coordenadas &&
              selectedSuggestion.data.coordenadas.x &&
              selectedSuggestion.data.coordenadas.y
            ) {
              dispatch(
                mapActions.cameraUpdated({
                  lat: selectedSuggestion.data.coordenadas.y,
                  lng: selectedSuggestion.data.coordenadas.x,
                  zoom: 17,
                  pitch: 60,
                  bearing: 0
                })
              )
            }
          }}
        />
      </Box>
    </>
  )
}

Map.propTypes = {
  children: PropTypes.arrayOf(PropTypes.any).isRequired
}

export default Map
