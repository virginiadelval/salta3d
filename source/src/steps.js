import React from 'react'

// eslint-disable-next-line import/prefer-default-export
export const largeScreenSteps = [
  {
    selector: '',
    content: () => (
      <div>
        <p>
          <b>
            AVISO LEGAL: Este sitio web tiene como objetivo brindar información
            urbanística con carácter orientativo, a los efectos de facilitar la
            comprensión de las normativas vigentes. Esta información no
            sustituye las normas legales vigentes ni constituye una copia fiel
            de los datos en poder de la Municipalidad de la Ciudad de Salta. Es
            responsabilidad del usuario confirmar mediante la vía administrativa
            pertinente la información provista en este sitio previo a alguna
            toma de decisión o acción. La información provista por esta página
            web es orientativa y no vinculante, al momento de realizar un
            trámite ante la Municipalidad de la Ciudad de Salta.
          </b>
        </p>
      </div>
    )
  },
  {
    selector: '.makeStyles-logo-5',
    content: () => (
      <div>
        <p>
          Este mapa es una herramienta online para saber qué se puede construir
          en determinadas parcelas de la Ciudad.
        </p>
      </div>
    )
  },
  {
    selector: '[data-tour="Information"]',
    content: () => (
      <div>
        <p>
          Acá vas a poder obtener información con respecto a la parcela
          seleccionada. Ya sean Datos Básicos o en cuanto al Código Urbanístico,
          podrás cargar y verificar tu proyecto (.ifc), calcular la plusvalía,
          ver los Usos, Obras registradas e Inspecciones.
        </p>
      </div>
    )
  },
  {
    selector: '[data-tour="LayerGroup"]',
    content: () => (
      <div>
        <p>
          Acá vas a poder obtener información de diferentes Capas como son Plano
          Base, Franja Edificable, Edificios Catalogados y Lotes con
          Afectaciones.
        </p>
      </div>
    )
  },
  {
    selector: '[data-tour="Explorer"]',
    content: () => (
      <div>
        <p>
          Acá vas a poder explorar utilizando diferentes filtros como Altura
          Código Urbanístico, Área Especial Individualizada, Mixtura de Uso y
          Barrios.
        </p>
      </div>
    )
  },
  {
    selector: '[data-tour="Report"]',
    content: () => (
      <div>
        <p>
          Acá vas a poder descargar un reporte con datos básicos de la parcela
          en PDF y CAD.
        </p>
      </div>
    )
  },
  {
    selector: '[data-tour="Contact"]',
    content: () => (
      <div>
        <p>
          Acá vas a poder enviarnos los comentarios que desees y contactarte con
          nosotros.
        </p>
      </div>
    )
  },
  {
    selector: '[data-tour="search-bar"]',
    content: () => (
      <div>
        <p>
          Acá vas a poder buscar por Dirección o Lugar y ubicarlo en el Mapa.
        </p>
      </div>
    )
  },
  {
    selector: '.maplibregl-ctrl-zoom-in',
    highlightedSelectors: ['.maplibregl-ctrl-zoom-out'],
    content: () => (
      <div>
        <p>Acá vas a poder hacer zoom en el mapa.</p>
      </div>
    )
  },
  {
    selector: '.maplibregl-ctrl-compass',
    content: () => (
      <div>
        <p>Acá vas a poder orientar el norte en el mapa.</p>
      </div>
    )
  },
  {
    selector: '.maplibregl-ctrl-group button:nth-child(4)',
    content: () => (
      <div>
        <p>Acá vas a poder medir en el mapa.</p>
      </div>
    )
  },
  {
    selector: '.maplibregl-ctrl-group button:nth-child(5)',
    content: () => (
      <div>
        <p>Acá vas a poder cambiar la vista de 2D a 3D.</p>
      </div>
    )
  },
  {
    selector: '[data-tour="minimap"]',
    content: () => (
      <div>
        <p>Acá vas a poder cambiar a Modo Claro el Mapa.</p>
      </div>
    )
  }
]
