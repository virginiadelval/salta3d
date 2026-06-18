# Actualizaciones WebSalta3D - Obras Privadas y Reportes

## 1. Modificación de Título en Reportes PDF
El título del archivo PDF exportado al consultar una parcela (desde la pestaña de Reportes) ha sido actualizado.
- **Antes**: `IDEMSa - CPUA - Catastro XXXX.pdf`
- **Ahora**: `Reporte Parcelario - Catastro XXXX - DD-MM-YYYY.pdf`

## 2. Nueva Integración de Obras Privadas
La búsqueda y listado de Planos Aprobados/Expedientes de Obras Privadas ha sido migrada a una tabla PostgreSQL local.
- **Tabla Origen**: Se reemplazó la conexión WFS al GeoServer (Capa `private:planos_aprobados`) por una conexión a la base de datos PostgreSQL local (`mcsa_gis`) en la tabla `obras_privadas_registro_expedientes_catastros_sep2025`.
- **Nuevo Endpoint Backend**: Se incorporó en el servidor Express (`backend/index.js`) el endpoint `GET /api/obras-privadas` para buscar directamente por `catastro` o `expediente`.
- **Selección Individual de PDF**: Anteriormente, al existir múltiples planos para un mismo catastro, se generaba un único documento PDF con todos ellos. Ahora la interfaz (en `PrivateWorks/index.js`) renderiza un botón "Generar PDF" por cada expediente encontrado, permitiendo emitir el reporte de manera unitaria y específica.

## 3. Reordenamiento en el Menú Principal
El archivo de configuración de categorías (`configBase.json`) se modificó para que el orden de los accesos en el Sidebar sea más intuitivo.
- **Cambio**: La sección "Obras Privadas" fue trasladada para mostrarse inmediatamente debajo de la sección "Reportes".
