/* eslint-disable camelcase */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import buildPDF from 'utils/reportTemplate'

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
      '10': 'Asfalto/Hormigón/Bituminoso/Adoquín',
      '11': 'Tierra con Cordón Cuneta',
      '12': 'Tierra sin Cordón Cuneta / Sin Dato'
    },
    recol: {
      '20': 'Especial (centro/gastronómico)',
      '21': 'Servicio matutino y nocturno',
      '22': 'Contenedores (6 barrios)',
      '23': 'Sin servicio'
    },
    barrido: {
      '30': 'Especial (centro/gastronómico)',
      '31': '6 veces por semana',
      '32': '3 veces por semana',
      '33': '1–2 veces por semana',
      '34': 'Sin servicio'
    },
    lusal: {
      '40': 'Lámpara LED',
      '41': 'Otro tipo de lámpara',
      '42': 'Sin servicio'
    },
    ev: {
      '50': 'Con servicio',
      '51': 'Sin servicio'
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

const getData = createAsyncThunk(
  'report/getData',
  async (smp, { getState }) => {
    let basicDataState = getState().basicData.data

    // If the data for this smp is already in basicData state, we can use it!
    // Otherwise, we query it dynamically.
    if (!basicDataState || basicDataState.smp !== smp) {
      // Fetch general info
      let info = {}
      try {
        const districtRes = await fetch(`https://geocloud.municipalidadsalta.gob.ar/getQ_CatastrosGis/${smp}`)
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
        const phCql = `catastro = ${smp} OR catastro = '${smp}'`
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
        const mvCql = `catastro = ${smp} OR catastro = '${smp}'`
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
          const catCql = `CATASTRO = ${smp} OR CATASTRO = '${smp}'`
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
        console.error('Error fetching parallel WFS information for reports:', err)
      }

      const finalDistrito = distrito !== 'No disponible' ? distrito : (zoningProps.DISTRITO || 'N/A')

      let dbRegimen = null
      let dbActividades = null

      if (finalDistrito && finalDistrito !== 'N/A' && finalDistrito !== 'No disponible') {
        try {
          const regUrl = `http://localhost:3001/api/regimen/${encodeURIComponent(finalDistrito.trim())}`
          const regRes = await fetch(regUrl)
          if (regRes.ok) {
            dbRegimen = await regRes.json()
          }
        } catch (e) {
          console.error('Error fetching local db regimen for reports:', e)
        }

        try {
          const actUrl = `http://localhost:3001/api/actividades/${encodeURIComponent(finalDistrito.trim())}`
          const actRes = await fetch(actUrl)
          if (actRes.ok) {
            dbActividades = await actRes.json()
          }
        } catch (e) {
          console.error('Error fetching local db activities for reports:', e)
        }
      }

      basicDataState = {
        smp: smp.toString(),
        direccion,
        barrio,
        comuna: 'Salta',
        distrito: finalDistrito,
        latitud: lat,
        longitud: lng,
        regimen: dbRegimen,
        actividades: dbActividades,

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
        mvs_valor_rang: mvProps.Valor_Rang || 'N/A'
      }
    }

    const {
      direccion,
      barrio,
      comuna,
      latitud,
      longitud,
      owner_name,
      owner_document,
      owner_cuit,
      mvs_tipo,
      mvs_cod_link,
      mvs_valor_rang,
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
      regimen,
      actividades
    } = basicDataState

    const decodedLink = decodeCodLink(mvs_cod_link)

    const generalInfoList = [
      {
        name: 'Dirección',
        value: direccion ?? ''
      },
      {
        name: 'Nomenclatura Catastral',
        value: smp ?? ''
      },
      {
        name: 'Tipo de Catastro',
        value: mvs_tipo ?? 'N/A'
      },
      {
        name: 'Inmueble protegido',
        value: inmueble_protegido ?? 'No'
      }
    ]

    if (inmueble_protegido === 'Si') {
      generalInfoList.push(
        {
          name: 'Categoría',
          value: prac_categoria ?? 'N/A'
        },
        {
          name: 'Número',
          value: prac_numero ?? 'N/A'
        },
        {
          name: 'Domicilio',
          value: prac_domicilio ?? 'N/A'
        },
        {
          name: 'Número calle',
          value: prac_inmueble ?? 'N/A'
        },
        {
          name: 'Tipología',
          value: prac_tipologia ?? 'N/A'
        },
        {
          name: 'Ficha',
          value: prac_ficha ?? 'N/A'
        },
        {
          name: 'Instrumento legal',
          value: prac_instrumento ?? 'Decreto Nº 392/19'
        }
      )
    }

    generalInfoList.push(
      {
        name: 'Barrio',
        value: barrio ?? ''
      },
      {
        name: 'Municipio',
        value: comuna ?? 'Salta'
      },
      {
        name: 'Latitud',
        value: latitud ? latitud.toString() : ''
      },
      {
        name: 'Longitud',
        value: longitud ? longitud.toString() : ''
      }
    )

    const activitiesDataList = []
    if (actividades && actividades.actividades && actividades.actividades.length > 0) {
      const listByState = {}
      actividades.actividades.forEach(act => {
        const est = act.estado || 'Otros'
        if (!listByState[est]) {
          listByState[est] = {}
        }
        const cat = act.categoria || 'Sin Categoría'
        if (!listByState[est][cat]) {
          listByState[est][cat] = []
        }
        listByState[est][cat].push(`* ${act.actividad} (${act.subcategoria})`)
      })

      const orderedStates = ['Permitido', 'Condicionado', 'Prohibido']
      const allStates = Object.keys(listByState).sort((a, b) => {
        const idxA = orderedStates.indexOf(a)
        const idxB = orderedStates.indexOf(b)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return a.localeCompare(b)
      })

      allStates.forEach(estadoGroup => {
        activitiesDataList.push({
          name: `--- Actividades con Estado: ${estadoGroup} ---`,
          value: ''
        })
        Object.keys(listByState[estadoGroup]).forEach(catGroup => {
          activitiesDataList.push({
            name: catGroup,
            value: listByState[estadoGroup][catGroup]
          })
        })
      })
    } else {
      activitiesDataList.push({
        name: 'Información',
        value: 'No disponible'
      })
    }

    const sections = [
      {
        title: 'Información General',
        dataList: generalInfoList
      },
      {
        title: 'Información Dominial',
        dataList: [
          {
            name: 'Propietario (PH)',
            value: owner_name ?? 'N/A'
          },
          {
            name: 'Documento (PH)',
            value: owner_document ?? 'N/A'
          },
          {
            name: 'CUIT (PH)',
            value: owner_cuit ?? 'N/A'
          }
        ]
      },
      {
        title: 'Servicios',
        dataList: [
          {
            name: 'Tipo de material de Calles',
            value: decodedLink.mvs_calle
          },
          {
            name: 'Servicios de Agrotécnica Fueguina (AF)',
            value: ' '
          },
          {
            name: '  • Recolección de residuos',
            value: decodedLink.mvs_recol
          },
          {
            name: '  • Tipo de barrido',
            value: decodedLink.mvs_barrido
          },
          {
            name: 'Alumbrado público',
            value: decodedLink.mvs_lusal
          },
          {
            name: 'Mantenimiento de Espacios Verdes',
            value: decodedLink.mvs_ev
          },
          {
            name: 'Presencia de Semáforos',
            value: decodedLink.mvs_semaforo
          }
        ]
      },
      {
        title: 'Categoria Impuesto Inmobiliario',
        dataList: [
          {
            name: 'Tasa General de Inmueble',
            value: zona_tgi ?? 'N/A'
          },
          {
            name: 'Inmpuesto Inmobilidaio',
            value: zona_ii ?? 'N/A'
          },
          {
            name: 'Zonificación Comercial ',
            value: zona_comer ?? 'N/A'
          }
        ]
      },
      {
        title: 'Más Valor Suelo',
        dataList: [
          {
            name: 'Rango de Valor del Suelo',
            value: mvs_valor_rang ?? 'N/A'
          }
        ]
      },

      {
        title: 'Régimen Urbanístico (Base de Datos)',
        dataList: regimen ? [
          { name: 'Sub Distrito', value: regimen.sub_distrito ?? 'N/A' },
          { name: 'Superficie Mínima', value: regimen.sup_minima ?? 'N/A' },
          { name: 'Frente Mínimo', value: regimen.frente_min ?? 'N/A' },
          { name: 'F.O.T. Privado', value: regimen.fot_privado ?? 'N/A' },
          { name: 'F.O.T. Público', value: regimen.fot_publico ?? 'N/A' },
          { name: 'F.O.S. VU', value: regimen.fos_vu ?? 'N/A' },
          { name: 'F.O.S. VOMF', value: regimen.fos_vomf ?? 'N/A' },
          { name: 'F.O.S. UC', value: regimen.fos_uc ?? 'N/A' },
          { name: 'Retiro de Jardín', value: regimen.r_jardin ?? 'N/A' },
          { name: 'Retiro de Fondo', value: regimen.r_fondo ?? 'N/A' },
          { name: 'Retiro de Perfil', value: regimen.r_perfil ?? 'N/A' },
          { name: 'Altura Máxima', value: regimen.altura_maxima ?? 'N/A' },
          { name: 'Plantas', value: regimen.plantas ?? 'N/A' },
          { name: 'F.O.S.', value: regimen.fos ?? 'N/A' },
          { name: 'Retiro de Frente', value: regimen.r_frente ?? 'N/A' },
          { name: 'Retiro Lateral', value: regimen.r_lateral ?? 'N/A' },
          { name: 'Retiro de Fondo 2', value: regimen.r_fondo2 ?? 'N/A' },
          { name: 'Retiro desde LM', value: regimen.r_desde_lm ?? 'N/A' },
          { name: 'Altura Máxima 2', value: regimen.altura_max ?? 'N/A' },
          { name: 'Fuente', value: regimen.fuente ?? 'N/A' },
          { name: 'Referencia', value: regimen.referencia ?? 'N/A' }
        ] : [
          { name: 'Información', value: 'No disponible' }
        ]
      },
      {
        title: 'Actividades del Suelo (Base de Datos)',
        dataList: activitiesDataList
      }
    ]

    return { smp, direccion, sections }
  },
  {
    condition: (smp, { getState }) => !getState().reports[smp]
  }
)

const download = createAsyncThunk(
  'report/download',
  async (smp, { getState }) => {
    const report = getState().reports[smp]
    await buildPDF(report.sections, `IDEMSa - CPUA - Catastro ${smp}.pdf`)
  }
)

const reports = createSlice({
  name: 'reports',
  initialState: {},
  extraReducers: {
    [getData.pending]: (draftState, { meta: { arg: smp } }) => {
      draftState[smp] = { state: 'loading' }
    },
    [getData.fulfilled]: (
      draftState,
      { payload: { smp, direccion, sections } }
    ) => {
      draftState[smp].sections = sections
      draftState[smp].state = 'ready'
      draftState[smp].address = direccion
    },
    [getData.rejected]: (draftState, { error, meta: { arg: smp } }) => {
      console.error('getData.rejected:', error)
      draftState[smp].state = 'error'
    },
    [download.rejected]: (draftState, { error, meta: { arg: smp } }) => {
      console.error('download.rejected:', error)
      draftState[smp].state = 'error'
    }
  }
})

export default reports.reducer

const actions = { ...reports.actions, getData, download }
export { actions }
