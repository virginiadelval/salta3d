# <p align="center">WebSalta3D - IDEMSa</p>

Plataforma para la visualización de información en 3D, y del Código Urbanístico de la Municipalidad de Salta.

# Indice

- [WebSalta3D](#websalta3d---idemsa)
  - [Nota del autor:](#nota-del-autor)
  - [Stack de Tecnología](#stack-de-tecnología)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Arquitectura de la Aplicación](#arquitectura-de-la-aplicación)
  - [Librerías](#librerías)
  - [Configuración de la Aplicación](#configuración-de-la-aplicación)
  - [API REST](#api-rest)
- [Ambiente de Desarrollo](#ambiente-de-desarrollo)
  - [Entorno](#entorno)
  - [IDE de desarrollo](#ide-de-desarrollo)
- [Deploy de la Aplicación](#deploy-de-la-aplicación)
  - [Entorno Producción](#entorno-producción)

### Nota del autor

Este proyecto depende fuertemente de la clase `src/utils/MapaInteractivoGL.js` que implementa la visualización de Vector Tiles con diferentes estilos, utilizando la librería de Mapbox-GL-js en su versión 1.0 (o MapLibre-GL-js en actualizaciones recientes).

## Stack de Tecnología

En este repositorio se encuentra el desarrollo del Frontend y una capa backend ligera para servicios internos.

- **Frontend**
  - React
  - Redux
  - Mapbox-GL-js / MapLibre-GL-js
- **Backend - API REST**
  - Node.js (Express)
  - Postgres + Postgis (Opcional según entorno)
- **Servidor Vector Tiles & Raster**
  - Servicios OGC (GeoServer / IDEMSa)

<br>

# Estructura del proyecto

A continuación especificamos la estructura de directorios del proyecto:

- **docs**: contiene la documentación adicional del proyecto.
- **source**: contiene el código fuente de la aplicación React.
- **backend**: contiene el código fuente de la API intermedia en NodeJS.

### Carpeta Source

- **containers**: Contiene el contenedor principal **Home** que sirve de base para **Map**, **SideBar** y **Sections**.
- **components**: Componentes principales de la UI.
  - **Map**: Contenedor del mapa generado por la librería GL.
  - **SideBar**: Contenedor de las categorías obtenidas dinámicamente de la configuración.
  - **Sections**: Despliegue de información al seleccionar elementos.
  - **Seeker**: Autocompletado para el buscador de calles/lugares de Salta.
- **state**: Estado de la aplicación administrado con Redux utilizando el patrón ducks.
- **theme**: Definiciones sobre los estilos visuales siguiendo lineamientos de Material Design y la identidad institucional de la **Municipalidad de Salta**.
- **utils**: Funciones transversales a toda la aplicación (configQueries, manejo del mapa, etc).

<br>

# Arquitectura de la Aplicación

## Librerías Destacadas

### **Mapbox GL JS / MapLibre GL JS**
El corazón de la aplicación. Para integrar el paradigma de eventos del mapa con el flujo de datos único de Redux, se utilizan promesas desde el middleware que invocan eventos del mapa y luego actualizan el estado global. Esto se gestiona principalmente en `mapBoxUtils` y `MapaInteractivoGL`.

## Configuración de la Aplicación

Toda la configuración principal del mapa base, capas 3D y servicios externos (APIs) ha sido desvinculada de servicios externos y se gestiona a través de los archivos `config.js`, `configBase.json` y `layersConfig.json` que apuntan a la infraestructura propia (`geocloud.municipalidadsalta.gob.ar`).

Las variables de entorno y los endpoints pueden ser ajustados en el archivo `config.js` y `configBase.json` ubicados en el directorio `public`.

## API REST y Servicios

Para la publicación de información se utilizan APIs configurables:
- **API Catastro / IDEMSa**: retorna la información de referencia de la Parcela (SMP) y datos geoespaciales de Salta.
- **Servicios OGC**: Proveen los mosaicos raster y WMS del territorio de la ciudad de Salta.

<br>

# Ambiente de Desarrollo

### Entorno
Se puede utilizar Node.js (v14+ recomendado). Soporta Windows, Linux y macOS.

### IDE de desarrollo
Se recomienda utilizar VSCode con las siguientes extensiones:
- **ESLint**
- **Prettier**
- **Debugger for Chrome**

<br>

# Deploy de la Aplicación

Para desplegar la aplicación en un entorno local o de producción:

1. Clonar el repositorio y acceder a la carpeta fuente:
```bash
git clone <url_repositorio>
cd source
```

2. Instalar dependencias:
```bash
npm install
```

3. Desarrollo Local:
Para levantar el servidor de pruebas local:
```bash
npm start
```
La aplicación correrá en `http://localhost:3005` (o el puerto definido en `.env`).

## Entorno Producción

Para compilar la versión optimizada:

```bash
npm run build
```

Esto generará los archivos finales estáticos dentro de la carpeta `build/`. Estos archivos pueden ser servidos utilizando Nginx, Apache o directamente expuestos en la raíz del repositorio para GitHub Pages/GitLab Pages, según sea la estrategia definida para **WebSalta3D**.

Asegúrese de que el archivo `config.js` referencie correctamente los dominios de la `Municipalidad de Salta` antes de realizar el despliegue final.
