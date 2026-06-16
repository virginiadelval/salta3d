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
import { getCustomDbApiUrl } from 'utils/configQueries'

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

const decodeCodLink = (codLink) => {
  const defaults = {
    mvs_calle: 'Sin Dato',
    mvs_recol: 'Sin Dato',
    mvs_barrido: 'Sin Dato',
    mvs_lusal: 'Sin Dato',
    mvs_ev: 'Sin Dato',
    mvs_semaforo: 'Sin Dato'
  }

  if (!codLink) {
    return defaults
  }

  const codStr = String(codLink).trim()
  if (codStr.length < 12) {
    return defaults
  }

  const cCalle = codStr.substring(0, 2)
  const cRecol = codStr.substring(2, 4)
  const cBarrido = codStr.substring(4, 6)
  const cLusal = codStr.substring(6, 8)
  const cEv = codStr.substring(8, 10)
  const cSemaforo = codStr.substring(10, 12)

  const mapping = {
    calle: {
      '10': 'Calle con Asfalto, Hormigón, Bituminoso ó Adoquín',
      '11': 'Calle de Tierra con Cordón Cuneta',
      '12': 'Calle de Tierra sin Cordón Cuneta o Sin Dato'
    },
    recol: {
      '20': 'Especial (centro/gastronómico)',
      '21': 'Servicio matutino y nocturno',
      '22': 'Contenedores (6 barrios)',
      '23': 'Sin servicio de recolección'
    },
    barrido: {
      '30': 'Especial (centro/gastronómico)',
      '31': '6 veces por semana',
      '32': '3 veces por semana',
      '33': '1–2 veces por semana',
      '34': 'Sin servicio de barrido'
    },
    lusal: {
      '40': 'Alumbrado con lámpara tipo LED',
      '41': 'Alumbrado con lámpara distinta de LED',
      '42': 'Sin servicio de alumbrado público'
    },
    ev: {
      '50': 'Con servicio en Espacios Verdes',
      '51': 'No hay Espacios Verdes en cerania'
    },
    semaforo: {
      '60': 'Con semáforo',
      '61': 'Sin semáforo'
    }
  }

  return {
    mvs_calle: mapping.calle[cCalle] || 'Sin Dato',
    mvs_recol: mapping.recol[cRecol] || 'Sin Dato',
    mvs_barrido: mapping.barrido[cBarrido] || 'Sin Dato',
    mvs_lusal: mapping.lusal[cLusal] || 'Sin Dato',
    mvs_ev: mapping.ev[cEv] || 'Sin Dato',
    mvs_semaforo: mapping.semaforo[cSemaforo] || 'Sin Dato'
  }
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

  let superficie_parcela = null;
  try {
    const catCql = `CATASTRO = ${catastro} OR CATASTRO = '${catastro}'`
    const catWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=public:catastros_Ene2025&outputFormat=application/json&cql_filter=${encodeURIComponent(catCql)}`
    const catRes = await fetch(catWfsUrl)
    if (catRes.ok) {
      const catData = await catRes.json()
      if (catData && catData.features && catData.features.length > 0) {
        const props = catData.features[0].properties
        superficie_parcela = props.SHAPE_Area || null
        if (!wfsGeom && catData.features[0].geometry) {
          wfsGeom = catData.features[0].geometry
        }
      }
    }
  } catch (err) {
    console.error('Error fetching public cadastre data:', err)
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

  // Fetch zoning and other WFS layers in parallel
  const zoningCql = `INTERSECTS(geom, POINT(${lng} ${lat}))`
  const zoningWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=public:Zonificacion_CPUA2025_CGO_15102025&outputFormat=application/json&cql_filter=${encodeURIComponent(zoningCql)}`
  const iiWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=public:zonificacion_II&outputFormat=application/json&cql_filter=${encodeURIComponent(zoningCql)}`
  const tgiWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=public:zonificacion_TGI&outputFormat=application/json&cql_filter=${encodeURIComponent(zoningCql)}`
  const comWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=public:zonificacion_comercial&outputFormat=application/json&cql_filter=${encodeURIComponent(zoningCql)}`
  const pracWfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=public:codigo_prac&outputFormat=application/json&cql_filter=${encodeURIComponent(zoningCql)}`

  let zoningProps = {}
  let zona_ii = 'N/A'
  let zona_tgi = 'N/A'
  let zona_comer = 'N/A'
  let inmueble_protegido = 'No'
  let prac_categoria = 'N/A'
  let prac_numero = 'N/A'
  let prac_domicilio = 'N/A'
  let prac_inmueble = 'N/A'
  let prac_tipologia = 'N/A'
  let prac_ficha = 'N/A'
  let prac_instrumento = 'N/A'

  try {
    const [zoningRes, iiRes, tgiRes, comRes, pracRes] = await Promise.all([
      fetch(zoningWfsUrl).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(iiWfsUrl).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(tgiWfsUrl).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(comWfsUrl).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(pracWfsUrl).then(r => r.ok ? r.json() : null).catch(() => null)
    ])

    if (zoningRes && zoningRes.features && zoningRes.features.length > 0) {
      zoningProps = zoningRes.features[0].properties
    }
    if (iiRes && iiRes.features && iiRes.features.length > 0) {
      zona_ii = iiRes.features[0].properties.zonaII || 'N/A'
    }
    if (tgiRes && tgiRes.features && tgiRes.features.length > 0) {
      zona_tgi = tgiRes.features[0].properties.zonaTGI || 'N/A'
    }
    if (comRes && comRes.features && comRes.features.length > 0) {
      zona_comer = comRes.features[0].properties.ZONA_COMER || 'N/A'
    }
    if (pracRes && pracRes.features && pracRes.features.length > 0) {
      inmueble_protegido = 'Si'
      const props = pracRes.features[0].properties
      prac_categoria = props.categoria || 'N/A'
      prac_numero = props.numero !== undefined && props.numero !== null ? props.numero.toString() : 'N/A'
      prac_domicilio = props.domicilio || 'N/A'
      prac_inmueble = props.inmueble || 'N/A'
      prac_tipologia = props.PRAC || 'N/A'
      prac_ficha = props.ficha || 'N/A'
      prac_instrumento = 'Decreto Nº 392/19'
    }
  } catch (err) {
    console.error('Error fetching parallel WFS information:', err)
  }

  const finalDistrito = distrito !== 'No disponible' ? distrito : (zoningProps.DISTRITO || 'N/A')

  let dbRegimen = null
  let dbActividades = null

  if (finalDistrito && finalDistrito !== 'N/A' && finalDistrito !== 'No disponible') {
    try {
      const regUrl = `${getCustomDbApiUrl()}/api/regimen/${encodeURIComponent(finalDistrito.trim())}`
      const regRes = await fetch(regUrl)
      if (regRes.ok) {
        dbRegimen = await regRes.json()
      }
    } catch (e) {
      console.error('Error fetching local db regimen:', e)
    }

    try {
      const actUrl = `${getCustomDbApiUrl()}/api/actividades/${encodeURIComponent(finalDistrito.trim())}`
      const actRes = await fetch(actUrl)
      if (actRes.ok) {
        dbActividades = await actRes.json()
      }
    } catch (e) {
      console.error('Error fetching local db activities:', e)
    }
  }

  return {
    smp: catastro.toString(),
    direccion,
    barrio,
    comuna: 'Salta',
    distrito: finalDistrito,
    latitud: lat,
    longitud: lng,
    centroide: [lng, lat],
    photoData: [],
    constitucionEstadoParcelario: null,
    regimen: dbRegimen,
    actividades: dbActividades,
    superficie_parcela,

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

    // New WFS layers properties
    zona_ii,
    zona_tgi,
    zona_comer,
    inmueble_protegido,
    prac_categoria,
    prac_numero,
    prac_domicilio,
    prac_inmueble,
    prac_tipologia,
    prac_ficha,
    prac_instrumento,

    // New owner properties (PH)
    owner_name: phProps.domape || 'N/A',
    owner_document: phProps.domnudoc || 'N/A',
    owner_cuit: phProps.domcuit || 'N/A',

    // New Soil Value properties
    mvs_tipo: mvProps.Tipo || 'N/A',
    mvs_cod_link: mvProps.COD_LINK || 'N/A',
    mvs_valor_rang: mvProps.Valor_Rang || 'N/A',
    ...decodeCodLink(mvProps.COD_LINK),
    mvs_af_header: ' '
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
  async (payload, { dispatch, getState }) => {
    let value = payload
    let type = 'catastro'
    if (payload && typeof payload === 'object') {
      value = payload.value
      type = payload.type
    }

    if (value !== null && value !== undefined) {
      let catastro = value
      if (type === 'cuenta') {
        const cql = `cuenta = ${value} OR cuenta = '${value}'`
        const url = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=private:0y1_codigolink_masvalorsuelo_ut_v1&outputFormat=application/json&cql_filter=${encodeURIComponent(cql)}`
        try {
          const res = await fetch(url)
          if (res.ok) {
            const dataJson = await res.json()
            if (dataJson && dataJson.features && dataJson.features.length > 0) {
              catastro = dataJson.features[0].properties.catastro
            } else {
              throw new Error('Número de cuenta no encontrado.')
            }
          } else {
            throw new Error('Error al consultar el número de cuenta.')
          }
        } catch (err) {
          throw new Error(err.message || 'Error en la conexión al buscar la cuenta.')
        }
      }

      const data = await getData({ smp: catastro })
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
