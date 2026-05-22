import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import { getGeometrical } from 'utils/apiConfig'

import { actions as categoriesActions } from 'state/ducks/categories'
import { actions as smpActions } from 'state/ducks/parcel'

const smpSelected = createAsyncThunk(
  'parcel/smpSelected',
  async (smp, { dispatch, getState }) => {
    dispatch(smpActions.updateSmp(smp))
    const { sectionId, sectionOpen } = getState().categories
    if (!sectionId || sectionId[0] !== 'Information' || !sectionOpen) {
      dispatch(categoriesActions.categorySelected('Information'))
    }

    const layers = [
      { name: 'public:catastros_Ene2025', filter: `CATASTRO = ${smp} OR CATASTRO = '${smp}'` },
      { name: 'private:vs_idemsa_prop_horizontal_con_propetario_2024', filter: `catastro = ${smp} OR catastro = '${smp}'` },
      { name: 'private:0y1_codigolink_masvalorsuelo_ut_v1', filter: `catastro = ${smp} OR catastro = '${smp}'` }
    ]

    let geom = null
    for (const layer of layers) {
      const wfsUrl = `https://geocloud.municipalidadsalta.gob.ar/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layer.name}&outputFormat=application/json&cql_filter=${encodeURIComponent(layer.filter)}`
      try {
        const response = await fetch(wfsUrl)
        if (response.ok) {
          const data = await response.json()
          if (data && data.features && data.features.length > 0) {
            geom = data.features[0].geometry
            if (geom) break
          }
        }
      } catch (err) {
        console.error(`Error fetching geometry from ${layer.name}:`, err)
      }
    }

    if (!geom) {
      throw new Error('Geometry not found in any layer')
    }

    let coords = null
    if (geom.type === 'MultiPolygon') {
      coords = geom.coordinates[0][0]
    } else if (geom.type === 'Polygon') {
      coords = geom.coordinates[0]
    }
    return coords
  },
  {
    condition: (_, { getState }) => {
      const state = getState()
      return !state.map.isMeasureActive
    }
  }
)

const parcel = createSlice({
  name: 'parcel',
  initialState: {
    isVisible: true,
    isParcelSelected: false,
    geomCoords: null,
    smp: null
  },
  reducers: {
    clean: (draftState) => {
      draftState.isVisible = false
      draftState.geomCoords = null
      draftState.smp = null
    },
    updateSmp: (draftState, action) => {
      draftState.smp = action.payload
    },
    setIsParcelSelected: (draftState, action) => {
      draftState.isParcelSelected = action.payload
    },
    updateGeomCoords: (draftState, action) => {
      draftState.geomCoords = action.payload
    }
  },
  extraReducers: {
    [smpSelected.fulfilled]: (draftState, action) => {
      draftState.geomCoords = action.payload
    },
    [smpSelected.rejected]: (draftState) => {
      draftState.geomCoords = null
    }
  }
})

export default parcel.reducer

const actions = { ...parcel.actions, smpSelected }
export { actions }
