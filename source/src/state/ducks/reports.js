/* eslint-disable camelcase */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import buildPDF from 'utils/reportTemplate'

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

      basicDataState = {
        smp: smp.toString(),
        direccion,
        barrio,
        comuna: 'Salta',
        distrito: distrito !== 'No disponible' ? distrito : (zoningProps.DISTRITO || 'N/A'),
        latitud: lat,
        longitud: lng,

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

    const {
      direccion,
      barrio,
      comuna,
      distrito,
      latitud,
      longitud,
      zoning_distrito,
      zoning_fos,
      zoning_fot_privado,
      zoning_fot_publico,
      zoning_altura_m,
      zoning_retiro_fondo,
      zoning_retiro_frente,
      zoning_criterio,
      zoning_area,
      zoning_area2,
      owner_name,
      owner_document,
      owner_cuit,
      mvs_tipo,
      mvs_cod_link,
      mvs_valor_rang
    } = basicDataState

    const sections = [
      {
        title: 'Información General',
        dataList: [
          {
            name: 'Dirección',
            value: direccion ?? ''
          },
          {
            name: 'Nomenclatura Catastral',
            value: smp ?? ''
          },
          {
            name: 'Barrio',
            value: barrio ?? ''
          },
          {
            name: 'Municipio',
            value: comuna ?? 'Salta'
          },
          {
            name: 'Distrito Catastral',
            value: distrito ?? ''
          },
          {
            name: 'Latitud',
            value: latitud ? latitud.toString() : ''
          },
          {
            name: 'Longitud',
            value: longitud ? longitud.toString() : ''
          },
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
        title: 'Zonificación de Usos del Suelo',
        dataList: [
          {
            name: 'Distrito CPUA',
            value: zoning_distrito ?? 'N/A'
          },
          {
            name: 'F.O.S. (Factor de Ocupación del Suelo)',
            value: zoning_fos ? zoning_fos.toString() : 'N/A'
          },
          {
            name: 'F.O.T. Privado',
            value: zoning_fot_privado ? zoning_fot_privado.toString() : 'N/A'
          },
          {
            name: 'F.O.T. Público',
            value: zoning_fot_publico ? zoning_fot_publico.toString() : 'N/A'
          },
          {
            name: 'Altura Máxima',
            value: zoning_altura_m ? `${zoning_altura_m.toString()} m` : 'N/A'
          },
          {
            name: 'Retiro de Fondo',
            value: zoning_retiro_fondo ? zoning_retiro_fondo.toString() : 'N/A'
          },
          {
            name: 'Retiro de Frente',
            value: zoning_retiro_frente ? zoning_retiro_frente.toString() : 'N/A'
          },
          {
            name: 'Criterio',
            value: zoning_criterio ?? 'N/A'
          },
          {
            name: 'Área',
            value: zoning_area ? zoning_area.toString() : 'N/A'
          },
          {
            name: 'Área 2',
            value: zoning_area2 ? zoning_area2.toString() : 'N/A'
          }
        ]
      },
      {
        title: 'Más Valor Suelo',
        dataList: [
          {
            name: 'Tipo de Catastro',
            value: mvs_tipo ?? 'N/A'
          },
          {
            name: 'Código de Enlace (COD_LINK)',
            value: mvs_cod_link ?? 'N/A'
          },
          {
            name: 'Rango de Valor del Suelo',
            value: mvs_valor_rang ?? 'N/A'
          }
        ]
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
