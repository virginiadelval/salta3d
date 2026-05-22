/**
 * WMS Layer Manager for MapLibre GL JS
 */

// Helper to convert longitude and latitude to Web Mercator EPSG:3857 meters
export const lngLatToMeters = (lng, lat) => {
  const x = (lng * 20037508.34) / 180;
  let y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return { x, y };
};

// Generates the WMS URL format with {bbox-epsg-3857}
export const getWmsTileUrl = (config) => {
  const { url, layers, format = 'image/png', transparent = true, version = '1.1.1' } = config;
  const baseUrl = url.includes('?') ? url : `${url}?`;
  const params = new URLSearchParams({
    service: 'WMS',
    version,
    request: 'GetMap',
    layers,
    format,
    transparent: transparent ? 'true' : 'false',
    srs: 'EPSG:3857',
    width: '256',
    height: '256'
  });
  
  // Note: curly braces {bbox-epsg-3857} must be appended unencoded for MapLibre
  return `${baseUrl}${params.toString()}&bbox={bbox-epsg-3857}`;
};

// Adds a WMS layer to the MapLibre map instance
export const addWMSLayer = (map, config) => {
  const sourceId = `source_${config.id}`;
  const layerId = config.id;

  if (map.getSource(sourceId)) {
    return;
  }

  const tileUrl = getWmsTileUrl(config);

  map.addSource(sourceId, {
    type: 'raster',
    tiles: [tileUrl],
    tileSize: 256
  });

  map.addLayer({
    id: layerId,
    type: 'raster',
    source: sourceId,
    layout: {
      visibility: config.visible ? 'visible' : 'none'
    },
    paint: {
      'raster-opacity': typeof config.opacity === 'number' ? config.opacity : 1.0
    }
  });
};

// Removes a WMS layer and its source from the map
export const removeWMSLayer = (map, id) => {
  const sourceId = `source_${id}`;
  if (map.getLayer(id)) {
    map.removeLayer(id);
  }
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
};

// Toggles visibility of a WMS layer
export const setWMSLayerVisibility = (map, id, visible) => {
  if (map.getLayer(id)) {
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }
};

// Updates opacity of a WMS layer
export const setWMSLayerOpacity = (map, id, opacity) => {
  if (map.getLayer(id)) {
    map.setPaintProperty(id, 'raster-opacity', opacity);
  }
};

// Performs a GetFeatureInfo request to retrieve feature attributes at click location
export const fetchWmsGetFeatureInfo = async (map, clickLngLat, wmsConfig) => {
  const { url, layers, version = '1.1.1' } = wmsConfig;
  
  const container = map.getContainer();
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Screen coordinates
  const pixelPoint = map.project(clickLngLat);
  const x = Math.round(pixelPoint.x);
  const y = Math.round(pixelPoint.y);

  // Map bounds
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  // Convert bounds corners to Web Mercator meters
  const swMeters = lngLatToMeters(sw.lng, sw.lat);
  const neMeters = lngLatToMeters(ne.lng, ne.lat);
  const bbox = `${swMeters.x},${swMeters.y},${neMeters.x},${neMeters.y}`;

  const baseUrl = url.includes('?') ? url : `${url}?`;
  
  // Build query params
  const params = {
    service: 'WMS',
    version,
    request: 'GetFeatureInfo',
    layers,
    query_layers: layers,
    info_format: 'application/json', // Try JSON first
    x: x.toString(),
    y: y.toString(),
    srs: 'EPSG:3857',
    bbox,
    width: width.toString(),
    height: height.toString()
  };

  const searchParams = new URLSearchParams(params);
  const queryUrl = `${baseUrl}${searchParams.toString()}`;

  try {
    const response = await fetch(queryUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json') || contentType.includes('json')) {
      const data = await response.json();
      return { format: 'json', data };
    } else {
      const text = await response.text();
      // Simple HTML tag cleanup or extraction if it's HTML text
      return { format: 'text', data: text };
    }
  } catch (error) {
    console.warn(`JSON GetFeatureInfo failed for layer ${layers}, trying text/html...`);
    
    // Fallback: try requesting text/html or text/plain
    try {
      const fallbackParams = new URLSearchParams({
        ...params,
        info_format: 'text/html'
      });
      const fallbackUrl = `${baseUrl}${fallbackParams.toString()}`;
      const response = await fetch(fallbackUrl);
      if (response.ok) {
        const text = await response.text();
        return { format: 'html', data: text };
      }
    } catch (fallbackError) {
      console.error('Fallback GetFeatureInfo also failed:', fallbackError);
    }
    
    return null;
  }
};
