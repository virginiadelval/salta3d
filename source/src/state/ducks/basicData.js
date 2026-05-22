import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import {
  getParcel,
  getParcelBySmp,
  getPhoto,
  getPhotoData,
  getDataApiServicioGeo,
  getConstitucionEstadoParcelario
} from 'utils/apiConfig'
import { actions as mapActions } from 'state/ducks/map'
import { actions as smpActions } from 'state/ducks/parcel'
import { actions as buildActions } from 'state/ducks/buildable'
import { actions as usesActions } from 'state/ducks/uses'
import { setModelCoordinates } from './IFC'

const cameraUpdated = (data, dispatch) => {
  const [lng, lat] = data.centroide
  dispatch(
    mapActions.cameraUpdated({
      lat,
      lng,
      zoom: 17,
      pitch: 60,
      bearing: 0
    })
  )
}

const getData = async ({ coord, smp }) => {
  let catastro = smp

  if (coord) {
    const cql = `INTERSECTS(geom, POINT(${coord.lng} ${coord.lat}))`
    const layers = [
      { name: 'public:catastros_Ene2025', catKey: 'CATASTRO' },
      { name: 'private:vs_idemsa_prop_horizontal_con_propetario_2024', catKey: 'catastro' },
      { name: 'private:0y1_codigolink_masvalorsuelo_ut_v1', catKey: 'catastro' }
    ]
    for (const layer of layers) {
      const wfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layer.name}&outputFormat=application/json&cql_filter=${encodeURIComponent(cql)}`
      try {
        const wfsRes = await fetch(wfsUrl)
        if (wfsRes.ok) {
          const wfsData = await wfsRes.ok ? await wfsRes.json() : null
          if (wfsData && wfsData.features && wfsData.features.length > 0) {
            catastro = wfsData.features[0].properties[layer.catKey]
            if (catastro) break
          }
        }
      } catch (e) {
        console.error(`Error querying coord in ${layer.name}:`, e)
      }
    }
  }

  if (!catastro) {
    throw new Error('No se encontró catastro.')
  }

  // Fetch general info
  let info = {}
  try {
    const districtRes = await fetch(`https://geocloud.municipalidadsalta.gob.ar/getQ_CatastrosGis/${catastro}`)
    if (districtRes.ok) {
      const districtData = await districtRes.json()
      if (districtData && districtData.length > 0) {
        info = districtData[0]
      }
    }
  } catch (err) {
    console.error('Error fetching district information:', err)
  }

  // Query WFS layers to find geometry and properties
  let phProps = {}
  let mvProps = {}
  let wfsGeom = null

  // 1. Query vs_idemsa_prop_horizontal_con_propetario_2024
  try {
    const phCql = `catastro = ${catastro} OR catastro = '${catastro}'`
    const phWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=private:vs_idemsa_prop_horizontal_con_propetario_2024&outputFormat=application/json&cql_filter=${encodeURIComponent(phCql)}`
    const phRes = await fetch(phWfsUrl)
    if (phRes.ok) {
      const phData = await phRes.json()
      if (phData && phData.features && phData.features.length > 0) {
        phProps = phData.features[0].properties
        if (phData.features[0].geometry) {
          wfsGeom = phData.features[0].geometry
        }
      }
    }
  } catch (err) {
    console.error('Error fetching PH owner info:', err)
  }

  // 2. Query 0y1_codigolink_masvalorsuelo_ut_v1
  try {
    const mvCql = `catastro = ${catastro} OR catastro = '${catastro}'`
    const mvWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=private:0y1_codigolink_masvalorsuelo_ut_v1&outputFormat=application/json&cql_filter=${encodeURIComponent(mvCql)}`
    const mvRes = await fetch(mvWfsUrl)
    if (mvRes.ok) {
      const mvData = await mvRes.json()
      if (mvData && mvData.features && mvData.features.length > 0) {
        mvProps = mvData.features[0].properties
        if (!wfsGeom && mvData.features[0].geometry) {
          wfsGeom = mvData.features[0].geometry
        }
      }
    }
  } catch (err) {
    console.error('Error fetching Soil Value info:', err)
  }

  // 3. Query public:catastros_Ene2025 if we still don't have geometry
  if (!wfsGeom) {
    try {
      const catCql = `CATASTRO = ${catastro} OR CATASTRO = '${catastro}'`
      const catWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=public:catastros_Ene2025&outputFormat=application/json&cql_filter=${encodeURIComponent(catCql)}`
      const catRes = await fetch(catWfsUrl)
      if (catRes.ok) {
        const catData = await catRes.json()
        if (catData && catData.features && catData.features.length > 0) {
          if (catData.features[0].geometry) {
            wfsGeom = catData.features[0].geometry
          }
        }
      }
    } catch (err) {
      console.error('Error fetching public cadastre geometry:', err)
    }
  }

  let lat = info.latitud
  let lng = info.longitud

  if ((!lat || !lng) && wfsGeom) {
    let coords = null
    if (wfsGeom.type === 'MultiPolygon') {
      coords = wfsGeom.coordinates[0][0]
    } else if (wfsGeom.type === 'Polygon') {
      coords = wfsGeom.coordinates[0]
    }
    if (coords && coords.length > 0) {
      let sumLng = 0
      let sumLat = 0
      coords.forEach(([cLng, cLat]) => {
        sumLng += cLng
        sumLat += cLat
      })
      lng = sumLng / coords.length
      lat = sumLat / coords.length
    }
  }

  if (!lat || !lng) {
    lat = -24.7859
    lng = -65.4117
  }

  const direccion = info.calle
    ? `${info.calle || ''} ${info.nro || ''}`.trim()
    : phProps.dcalle
      ? `${phProps.dcalle || ''} ${phProps.dnumro || ''}`.trim()
      : 'Dirección no disponible'

  const barrio = info.barrio || phProps.ddesbarrio || 'No disponible'
  const distrito = info.distrito || 'No disponible'

  // Fetch zoning info
  const zoningCql = `INTERSECTS(geom, POINT(${lng} ${lat}))`
  const zoningWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=public:Zonificacion_CPUA2025_CGO_15102025&outputFormat=application/json&cql_filter=${encodeURIComponent(zoningCql)}`

  let zoningProps = {}
  try {
    const zoningRes = await fetch(zoningWfsUrl)
    if (zoningRes.ok) {
      const zoningData = await zoningRes.json()
      if (zoningData && zoningData.features && zoningData.features.length > 0) {
        zoningProps = zoningData.features[0].properties
      }
    }
  } catch (err) {
    console.error('Error fetching zoning information:', err)
  }

  return {
    smp: catastro.toString(),
    direccion,
    barrio,
    comuna: 'Salta',
    distrito: distrito !== 'No disponible' ? distrito : (zoningProps.DISTRITO || 'N/A'),
    latitud: lat,
    longitud: lng,
    centroide: [lng, lat],
    photoData: [],
    constitucionEstadoParcelario: null,

    // Zoning fields
    zoning_distrito: zoningProps.DISTRITO || 'N/A',
    zoning_fos: zoningProps.FOS !== null && zoningProps.FOS !== undefined ? zoningProps.FOS : 'N/A',
    zoning_fot_privado: zoningProps.FOT_PRIVADO !== null && zoningProps.FOT_PRIVADO !== undefined ? zoningProps.FOT_PRIVADO : 'N/A',
    zoning_fot_publico: zoningProps.FOT_PUBLICO !== null && zoningProps.FOT_PUBLICO !== undefined ? zoningProps.FOT_PUBLICO : 'N/A',
    zoning_altura_m: zoningProps.ALTURA_M !== null && zoningProps.ALTURA_M !== undefined ? zoningProps.ALTURA_M : 'N/A',
    zoning_retiro_fondo: zoningProps.RETIRO_FONDO !== null && zoningProps.RETIRO_FONDO !== undefined ? zoningProps.RETIRO_FONDO : 'N/A',
    zoning_retiro_frente: zoningProps.RETIRO_FRENTE !== null && zoningProps.RETIRO_FRENTE !== undefined ? zoningProps.RETIRO_FRENTE : 'N/A',
    zoning_criterio: zoningProps.CRITERIO || 'N/A',
    zoning_area: zoningProps.AREA !== null && zoningProps.AREA !== undefined ? zoningProps.AREA : 'N/A',
    zoning_area2: zoningProps.AREA2 !== null && zoningProps.AREA2 !== undefined ? zoningProps.AREA2 : 'N/A',

    // New owner properties (PH)
    owner_name: phProps.domape || 'N/A',
    owner_document: phProps.domnudoc || 'N/A',
    owner_cuit: phProps.domcuit || 'N/A',

    // New Soil Value properties
    mvs_tipo: mvProps.Tipo || 'N/A',
    mvs_cod_link: mvProps.COD_LINK || 'N/A',
    mvs_valor_rang: mvProps.Valor_Rang || 'N/A'
  }
}

const selectedParcel = createAsyncThunk(
  'basicData/selectedParcel',
  async (coord, { dispatch, getState }) => {
    const data = await getData({ coord })
    const { smp } = data
    if (smp) {
      if (!getState().parcel.smp) {
        !getState().IFC.IFCModelBlob &&
          dispatch(setModelCoordinates(data.centroide))
        cameraUpdated(data, dispatch)
      }
      !getState().IFC.IFCModelBlob &&
        dispatch(setModelCoordinates(data.centroide))
      dispatch(buildActions.clickOnParcel(smp))
      dispatch(smpActions.smpSelected(smp))
      dispatch(smpActions.setIsParcelSelected(true))
      dispatch(usesActions.setIsParcelaEnMicrocentro(null))
      return data
    }
    dispatch(smpActions.clean())
    dispatch(smpActions.setIsParcelSelected(false))
    return {
      smp: null,
      photoData: []
    }
  },
  {
    condition: ({ lat, lng }, { getState }) =>
      lat !== undefined &&
      lng !== undefined &&
      !getState().basicData.isLoading &&
      !getState().map.isMeasureActive
  }
)

const seekerParcel = createAsyncThunk(
  'basicData/seekerParcel',
  async (smp, { dispatch, getState }) => {
    if (smp !== null && smp !== undefined) {
      const data = await getData({ smp })
      !getState().IFC.IFCModelBlob &&
        dispatch(setModelCoordinates(data.centroide))
      cameraUpdated(data, dispatch)
      dispatch(buildActions.clickOnParcel(data.smp))
      dispatch(smpActions.smpSelected(data.smp))
      dispatch(smpActions.setIsParcelSelected(true))
      return data
    }
    throw new Error()
  },
  {
    condition: (_, { getState }) => !getState().basicData.isLoading
  }
)

const basicData = createSlice({
  name: 'basicData',
  initialState: {
    data: {
      smp: null
    },
    isSelected: false,
    isLoading: false
  },
  reducers: {
    updateBasicData: (draftState, action) => {
      draftState.data = action.payload
      draftState.isSelected = true
      draftState.isLoading = false
    },
    clean: (draftState) => {
      draftState.data = { smp: null }
      draftState.isSelected = false
      draftState.isLoading = false
    }
  },
  extraReducers: {
    [selectedParcel.pending]: (draftState) => {
      draftState.isLoading = true
    },
    [selectedParcel.fulfilled]: (draftState, action) => {
      draftState.isLoading = false
      draftState.isSelected = true
      draftState.data = action.payload
    },
    [selectedParcel.rejected]: (draftState) => {
      draftState.isLoading = false
    },
    [seekerParcel.pending]: (draftState) => {
      draftState.isLoading = true
    },
    [seekerParcel.fulfilled]: (draftState, action) => {
      draftState.isLoading = false
      draftState.isSelected = true
      draftState.data = action.payload
    },
    [seekerParcel.rejected]: (draftState) => {
      draftState.isLoading = false
      draftState.isSelected = false
      draftState.data = { smp: null }
    }
  }
})

export default basicData.reducer

const actions = { ...basicData.actions, selectedParcel, seekerParcel }
export { actions }
