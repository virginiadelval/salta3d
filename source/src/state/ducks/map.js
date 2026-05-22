import {
  loadAppConfig,
  getLayersGroups,
  getLayersByLayersGroupId,
  getFullLayerConfig,
  getExplorerFilters,
  getFullExplorerLayerConfig,
  getBaseLayers,
  getCamera,
  getImagesToLoad,
  getImagesToMerge
} from 'utils/configQueries'
import { mapOnPromise, loadImages, mergeImages } from 'utils/maplibreUtils'
import { addWMSLayer, setWMSLayerVisibility, setWMSLayerOpacity } from 'utils/wmsLayerManager'

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

let mapGL = null

const add = async (layer) => {
  const options = Array.isArray(layer.options) ? layer.options : [layer.options]

  options.forEach((option) => {
    mapGL.addVectorTileLayer(
      {
        id: option.id || layer.id,
        ...option
      },
      null,
      layer.displayPopup,
      layer.popupContent
    )
  })
}

const getNewOrder = (groups, layerId) =>
  Object.values(groups)
    .flatMap((group) => Object.entries(group))
    .filter(([id, { isVisible }]) => isVisible || id === layerId)
    .sort(
      ([ida, { index: ia, order: oa }], [idb, { index: ib, order: ob }]) => {
        const diff = ib - ia
        if (diff === 0) {
          return (
            (idb === layerId ? 999999 : ob) - (ida === layerId ? 999999 : oa)
          )
        }
        return diff
      }
    )

const moveLayers = (newOrder) => {
  const count = newOrder.length

  if (count > 0 && mapGL.map.getLayer('parcel_layer')) {
    mapGL.map.moveLayer(newOrder[0][0], 'parcel_layer')
  }
  if (count > 0 && mapGL.map.getLayer('edif_smp')) {
    mapGL.map.moveLayer(newOrder[0][0], 'edif_smp')
  }
  for (let idx = 1; idx < count; idx += 1) {
    mapGL.map.moveLayer(newOrder[idx][0], newOrder[idx - 1][0])
  }
  if (
    mapGL.map.getLayer('explorer_layer') &&
    (count > 0 || mapGL.map.getLayer('parcel_layer'))
  ) {
    mapGL.map.moveLayer(
      'explorer_layer',
      count > 0 ? newOrder[count - 1][0] : 'parcel_layer'
    )
  }
}

const calculateOrder = (groups, layerId, index) =>
  Object.values(groups)
    .flatMap((group) => Object.entries(group))
    .filter(
      ([id, { isVisible, index: idx }]) =>
        isVisible && idx === index && id !== layerId
    )
    .reduce(
      (maxOrder, [, { order: oa }]) => (oa > maxOrder ? oa : maxOrder),
      0
    ) + 1

const reorderLayers = async (groups, layerId, index) => {
  const newOrder = getNewOrder(groups, layerId)
  moveLayers(newOrder)
  const order = calculateOrder(groups, layerId, index)

  return { order }
}

const toggle = async (layer, index, groups, isVisible = null) => {
  const { map } = mapGL

  if (map.getLayer(layer.id)) {
    const visibility =
      map.getLayoutProperty(layer.id, 'visibility') ?? 'visible'
    const nextVisibility =
      isVisible !== null ? isVisible : visibility === 'none'

    const { options } = layer
    const internalLayers = Array.isArray(options) ? options : [options]
    const ids = [layer.id, ...internalLayers.map(({ id }) => id)].filter(
      (id) => id
    )
    ids.forEach((id) => {
      map.setLayoutProperty(
        id,
        'visibility',
        nextVisibility ? 'visible' : 'none'
      )
    })
    return reorderLayers(groups, layer.id, index)
  }

  return (
    add(layer)
      .then(() => mapOnPromise(mapGL.map)('idle'))
      .then(() => reorderLayers(groups, layer.id, index))
      // Se visualiza la capa luego de ser ordenada
      .then(() => map.setLayoutProperty(layer.id, 'visibility', 'visible'))
      // eslint-disable-next-line no-console
      .catch((error) => console.warn('toggle add layer - catch error:', error))
  )
}

const toggleWmsLayer = createAsyncThunk(
  'map/toggleWmsLayer',
  async ({ id }, { getState }) => {
    const state = getState()
    const wmsLayer = state.map.wmsLayers.find((l) => l.id === id)
    if (!wmsLayer) return { id }

    const nextVisible = !wmsLayer.visible

    if (mapGL && mapGL.map) {
      const mapInstance = mapGL.map
      if (nextVisible) {
        addWMSLayer(mapInstance, { ...wmsLayer, visible: true })
      } else {
        setWMSLayerVisibility(mapInstance, id, false)
      }

      // Synchronize layer drawing order
      const wmsLayers = state.map.wmsLayers.map((l) =>
        l.id === id ? { ...l, visible: nextVisible } : l
      )
      for (let i = wmsLayers.length - 1; i >= 0; i--) {
        const layer = wmsLayers[i]
        if (layer.visible && mapInstance.getLayer(layer.id)) {
          mapInstance.moveLayer(layer.id)
        }
      }
    }
    return { id, visible: nextVisible }
  }
)

const changeWmsLayerOpacity = createAsyncThunk(
  'map/changeWmsLayerOpacity',
  async ({ id, opacity }) => {
    if (mapGL && mapGL.map) {
      setWMSLayerOpacity(mapGL.map, id, opacity)
    }
    return { id, opacity }
  }
)

const zoomToWmsLayer = createAsyncThunk(
  'map/zoomToWmsLayer',
  async ({ id }, { getState }) => {
    const state = getState()
    const wmsLayer = state.map.wmsLayers.find((l) => l.id === id)
    if (wmsLayer && wmsLayer.boundingBox && mapGL && mapGL.map) {
      mapGL.map.fitBounds(wmsLayer.boundingBox, { padding: 50 })
    }
  }
)

const moveWmsLayer = createAsyncThunk(
  'map/moveWmsLayer',
  async ({ id, direction }, { dispatch, getState }) => {
    dispatch(map.actions.reorderWmsLayer({ id, direction }))
    if (mapGL && mapGL.map) {
      const state = getState()
      const wmsLayers = state.map.wmsLayers
      const mapInstance = mapGL.map
      for (let i = wmsLayers.length - 1; i >= 0; i--) {
        const layer = wmsLayers[i]
        if (mapInstance.getLayer(layer.id)) {
          mapInstance.moveLayer(layer.id)
        }
      }
    }
  }
)

const loadLayers = createAsyncThunk('map/loadLayers', async () => {
  await loadAppConfig()

  const explorerLayers = {}
  getExplorerFilters().forEach(({ id: idExplorer }) => {
    explorerLayers[idExplorer] = {}
    explorerLayers[idExplorer].layers = {
      processingId: null,
      isVisible: false
    }
  })
  const groups = {}
  // devuelve cada id y title de config.layersGroup
  getLayersGroups().forEach(({ id: idGroup, index = 0 }) => {
    groups[idGroup] = {}
    // devuelve el title, id y color de cada layersGroup.layers
    getLayersByLayersGroupId(idGroup).forEach(
      async ({ id: idLayer, index: idxLayer }) => {
        groups[idGroup][idLayer] = {
          processingId: null,
          isVisible: false,
          index: idxLayer ?? index,
          order: 0
        }
      }
    )
  })

  const baseLayers = getBaseLayers()
  let wmsLayers = []
  try {
    wmsLayers = await fetch('./wmsConfig.json').then((res) => res.json())
  } catch (err) {
    console.error('Error fetching wmsConfig.json:', err)
  }

  return {
    explorerLayers,
    groups,
    baseLayers,
    wmsLayers
  }
})

const initMap = createAsyncThunk(
  'map/initMap',
  async (mapInstance) => {
    mapGL = mapInstance
    const mapOnLoad = mapOnPromise(mapInstance.map)('load')
    const imagesToLoad = getImagesToLoad().map(({ id, data }) => ({
      id,
      data
    }))
    const imagesToMerge = getImagesToMerge()

    return mapOnLoad
      .then(() => loadImages(mapGL.map, imagesToLoad))
      .then(() =>
        imagesToMerge.forEach((images) => mergeImages(mapGL.map, images))
      )
      .then(() => true)
      .catch(() => false)
  },
  {
    condition: () => mapGL === null
  }
)

const getLayerState = (state, idGroup, idLayer) =>
  state.groups[idGroup][idLayer]

const chooseLayer = (layer) => {
  const PLANCHETAS_CUR_POINTS = {
    id: 'planchetas_cur_points',
    type: 'symbol',
    paint: {
      'text-color': 'black'
    },
    layout: {
      'text-field': ['get', 'Zonigril_I'],
      'text-font': ['Klokantech Noto Sans Bold'],
      'text-rotation-alignment': 'auto',
      'text-allow-overlap': true,
      'text-anchor': 'top'
    },
    source: {
      type: 'geojson',
      data: './PLANCHETAS_CUR_POINTS.json',
      cluster: false
    }
  }

  if (layer.id === 'Plancheta_CUr') {
    const PLANCHETA_CUR_LAYER = {
      ...layer,
      options: [
        { ...layer['options'], id: 'Plancheta_CUr' },
        PLANCHETAS_CUR_POINTS
      ]
    }
    return PLANCHETA_CUR_LAYER
  }

  return layer
}
// Notar que si el server falla el tilde parece dejar de funcionar
// si falla se desea el toggle se comporte como si el server funcionara bien
// Si se espera el tilde vuelve a funcionar, tarda porque se espera map este idle
const toggleLayer = createAsyncThunk(
  'map/toggleLayer',
  async ({ idGroup, idLayer }, { getState }) => {
    const state = getState()
    const { isVisible, index } = getLayerState(state.map, idGroup, idLayer)
    const full_layer = getFullLayerConfig(idGroup, idLayer)
    const layer = chooseLayer(full_layer)
    const { order } = await toggle(layer, index, state.map.groups, isVisible)
    const onPromise = mapOnPromise(mapGL.map)
    onPromise('idle')
      // eslint-disable-next-line no-console
      .catch((error) => console.warn('toggleLayer catch error:', error))
    return { order }
  },
  {
    condition: ({ idGroup, idLayer }, { getState }) => {
      const state = getState()
      const layerState = getLayerState(state.map, idGroup, idLayer)
      return state.map.isMapReady && layerState.processingId === null
    }
  }
)

const selectedExplorerFilter = createAsyncThunk(
  'map/selectedExplorerFilter',
  async ({ value }, { getState }) => {
    const idExplorer = value[0].id
    const explorerLayer = getFullExplorerLayerConfig(idExplorer)
    const mapOnIdle = mapOnPromise(mapGL.map)('idle')
    await add(explorerLayer)
    await mapOnIdle
      .then(() => reorderLayers(getState().map.groups))
      .then(() =>
        mapGL.map.setLayoutProperty(explorerLayer.id, 'visibility', 'visible')
      )
      .catch(() => false)
    return 2
  }
)

const filterUpdate = createAsyncThunk(
  'map/filterUpdate',
  async ({ layers }) => {
    layers.forEach((l) => {
      const { idLayer, groups } = l

      const newFilters = [
        'all',
        ...groups.map(({ filter }) => ['any', ...filter])
      ]

      const layer = mapGL.map.getLayer(idLayer)
      if (layer !== undefined) {
        mapGL.setFilter(idLayer, newFilters)
      }
    })
  }
)

const removeLayer = createAsyncThunk('map/removeLayer', async ({ idLayer }) => {
  const layer = mapGL.map.getLayer(idLayer)
  if (layer !== undefined) {
    mapGL.removeVectorTileLayer(idLayer)
  }
})

const map = createSlice({
  name: 'map',
  initialState: {
    isMapReady: false,
    defaultMapStyle: null,
    camera: null,
    selectedCoords: null,
    groups: {},
    explorerLayers: {},
    wmsLayers: []
  },
  reducers: {
    isMeasureActive: (draftState, { payload: isActive }) => {
      draftState.isMeasureActive = isActive
    },
    cameraUpdated: (
      draftState,
      {
        payload: {
          lat: newLat,
          lng: newLng,
          zoom: newZoom,
          pitch: newPitch,
          bearing: newBearing
        }
      }
    ) => {
      const { zoom, pitch, bearing } = draftState.camera
      draftState.camera = {
        lat: newLat,
        lng: newLng,
        zoom: newZoom || zoom,
        pitch: typeof newPitch === 'number' ? newPitch : pitch,
        bearing: typeof newBearing === 'number' ? newBearing : bearing
      }
    },
    setMapReady: (draftState) => {
      draftState.isMapReady = true
    },
    clickOnMap: (draftState, action) => {
      draftState.selectedCoords = action.payload
    },
    reorderWmsLayer: (draftState, { payload: { id, direction } }) => {
      const index = draftState.wmsLayers.findIndex((l) => l.id === id)
      if (index === -1) return

      if (direction === 'up' && index > 0) {
        const temp = draftState.wmsLayers[index]
        draftState.wmsLayers[index] = draftState.wmsLayers[index - 1]
        draftState.wmsLayers[index - 1] = temp
      } else if (direction === 'down' && index < draftState.wmsLayers.length - 1) {
        const temp = draftState.wmsLayers[index]
        draftState.wmsLayers[index] = draftState.wmsLayers[index + 1]
        draftState.wmsLayers[index + 1] = temp
      }
    }
  },
  extraReducers: {
    [initMap.fulfilled]: (draftState, action) => {
      draftState.isMapReady = action.payload
    },
    [toggleLayer.pending]: (
      draftState,
      {
        meta: {
          requestId,
          arg: { idGroup, idLayer }
        }
      }
    ) => {
      const layerState = getLayerState(draftState, idGroup, idLayer)
      layerState.processingId = requestId
      layerState.isVisible = !layerState.isVisible
    },
    [toggleLayer.fulfilled]: (
      draftState,
      {
        payload: { order },
        meta: {
          requestId,
          arg: { idGroup, idLayer }
        }
      }
    ) => {
      const layerState = getLayerState(draftState, idGroup, idLayer)
      if (layerState.processingId === requestId) {
        layerState.processingId = null
        layerState.order = order
      }
    },
    [toggleLayer.rejected]: (
      draftState,
      {
        meta: {
          requestId,
          arg: { idGroup, idLayer }
        }
      }
    ) => {
      const layerState = getLayerState(draftState, idGroup, idLayer)
      if (layerState.processingId === requestId) {
        layerState.processingId = null
      }
    },
    [toggleWmsLayer.fulfilled]: (draftState, { payload: { id, visible } }) => {
      const layer = draftState.wmsLayers.find((l) => l.id === id)
      if (layer) {
        layer.visible = visible
      }
    },
    [changeWmsLayerOpacity.fulfilled]: (draftState, { payload: { id, opacity } }) => {
      const layer = draftState.wmsLayers.find((l) => l.id === id)
      if (layer) {
        layer.opacity = opacity
      }
    },
    [loadLayers.fulfilled]: (
      draftState,
      {
        payload: {
          explorerLayers,
          groups,
          baseLayers: { sources, layers, light },
          wmsLayers
        }
      }
    ) => {
      draftState.groups = groups
      draftState.explorerLayers = explorerLayers
      draftState.wmsLayers = wmsLayers || []
      draftState.camera = getCamera()
      draftState.defaultMapStyle = {
        version: 8,
        sources,
        layers,
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
        light
      }
    }
  }
})

export default map.reducer

const actions = {
  ...map.actions,
  initMap,
  toggleLayer,
  selectedExplorerFilter,
  filterUpdate,
  removeLayer,
  loadLayers,
  toggleWmsLayer,
  changeWmsLayerOpacity,
  zoomToWmsLayer,
  moveWmsLayer
}
export { actions }
