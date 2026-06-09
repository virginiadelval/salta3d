import { useEffect } from 'react'

import { getParcelLayer } from 'utils/configQueries'

import MapaInteractivoGL from 'utils/MapaInteractivoGL'
import IFC from 'components/IFC'
const parcelId = 'parcel_layer'
// Añadir pleta de colores//
function styleCatastros(feature) {
  return {
    fillColor: '#000000',
    weight: 1.5,
    opacity: 0.7,
    color: 'black',
    dashArray: '0',
    fillOpacity: 0
  }
}

const Polygon = ({ smpList, geomCoords }) => {
  const mapGL = MapaInteractivoGL()

  const {
    edif
  } = getParcelLayer()
  const { id: edifId } = edif
  useEffect(() => {
    mapGL.map.addLayer(edif)
    return () => {
      mapGL.map.removeLayer(edifId)
      mapGL.map.removeSource(edifId)
    }
  }, [edif, edifId, mapGL])

  useEffect(() => {
    const parcel3D = mapGL.map.getLayer(edifId)
    if (parcel3D !== undefined) {
      mapGL.setFilter(edifId, [
        'in',
        ['upcase', ['get', 'smp']],
        smpList.join(',').toUpperCase()
      ])
    }
  }, [mapGL, smpList, edifId])

  useEffect(() => {
    if (geomCoords !== null) {
      const source = mapGL.map.getSource(parcelId)
      if (source === undefined) {
        mapGL.map.addSource(parcelId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [geomCoords]
            }
          }
        })
      }
      
      const style = styleCatastros({ geometry: geomCoords })

      // Capa de relleno (sin color adentro, opacidad 0)
      mapGL.map.addLayer({
        id: parcelId,
        source: parcelId,
        type: 'fill',
        paint: {
          'fill-color': style.fillColor,
          'fill-opacity': style.fillOpacity
        }
      })

      // Capa de borde de color negro
      const borderLayerId = `${parcelId}_border`
      mapGL.map.addLayer({
        id: borderLayerId,
        source: parcelId,
        type: 'line',
        paint: {
          'line-color': style.color,
          'line-width': style.weight,
          'line-opacity': style.opacity
        }
      })

      mapGL.map.moveLayer(parcelId, edifId)
      mapGL.map.moveLayer(borderLayerId, edifId)
    }
    return () => {
      if (mapGL.map.getLayer(parcelId)) {
        mapGL.map.removeLayer(parcelId)
      }
      const borderLayerId = `${parcelId}_border`
      if (mapGL.map.getLayer(borderLayerId)) {
        mapGL.map.removeLayer(borderLayerId)
      }
      if (mapGL.map.getSource(parcelId)) {
        mapGL.map.removeSource(parcelId)
      }
    }
  }, [geomCoords, mapGL, edifId])

  return <IFC />
}

export default Polygon
