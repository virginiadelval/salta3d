// eslint-disable-next-line no-var
var configs = {
  urlConfigBase: 'configBase.json',
  urlLayers: 'layersConfig.json',
  includes: {
    urlAPI: '',
    urlPhoto: '',
    urlWsUsig: '',
    urlApiServicioGeo: '',
    urlPDF: '',
    urlCAD: ''
  },
  replaces: [
    {
      key: '{{urlVectorTile}}',
      value: ''
    },
    {
      key: '{{urlBsAs}}',
      value: ''
    },
    {
      key: '{{urlCDN2}}',
      value: ''
    },
    {
      key: '{{urlBoletin}}',
      value: ''
    },
    {
      key: '{{urlBsAsData}}',
      value: ''
    },
    {
      key: '{{urlBcra}}',
      value: ''
    },
    {
      key: '{{urlTAD}}',
      value: ''
    },
    {
      key: '{{urlUsig}}',
      value: ''
    },
    {
      key: '{{urlCedom}}',
      value: ''
    },
    {
      key: '{{urlEpsg}}',
      value: 'https://epsg.org/'
    }
  ]
}
