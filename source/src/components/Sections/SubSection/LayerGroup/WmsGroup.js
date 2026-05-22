import React, { useState } from 'react'
import {
  Checkbox,
  FormControlLabel,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  Slider,
  Popover,
  IconButton,
  Tooltip,
  Divider,
  Button
} from '@mui/material'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import SettingsIcon from '@mui/icons-material/Settings'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

import { useDispatch, useSelector } from 'react-redux'
import { actions } from 'state/ducks/map'
import decorators from 'theme/fontsDecorators'
import styles from './groupStyle'

const WmsItem = ({ id, name, visible, opacity, url, layers, isFirst, isLast }) => {
  const dispatch = useDispatch()
  const [anchorEl, setAnchorEl] = useState(null)

  const layerChangeHandler = () => {
    dispatch(actions.toggleWmsLayer({ id }))
  }

  const opacityChangeHandler = (event, newValue) => {
    dispatch(actions.changeWmsLayerOpacity({ id, opacity: newValue }))
  }

  const handleOpenSettings = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseSettings = () => {
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)

  // OGC GetLegendGraphic request URL
  const legendUrl = `${url}?service=WMS&request=GetLegendGraphic&format=image/png&width=20&height=20&layer=${layers}&legend_options=forceRuleLabel:on;fontSize:11`
  // WFS request URLs
  const wfsBaseUrl = url.replace('/wms', '/wfs')
  const downloadGeoJsonUrl = `${wfsBaseUrl}?request=GetFeature&service=WFS&version=1.0.0&typeName=${layers}&outputFormat=application/json`
  const downloadShapefileUrl = `${wfsBaseUrl}?request=GetFeature&service=WFS&version=1.0.0&typeName=${layers}&outputFormat=SHAPE-ZIP`

  return (
    <Box sx={{ width: '100%', mb: 0.5 }}>
      <ListItem sx={styles.listItem}>
        <FormControlLabel
          sx={styles.formControl}
          control={
            <Checkbox
              icon={
                <CheckBoxOutlineBlankIcon
                  fontSize="small"
                  style={{ color: '#717170' }}
                />
              }
              checkedIcon={
                <CheckBoxIcon fontSize="small" style={{ color: '#333' }} />
              }
              checked={visible}
              onChange={layerChangeHandler}
              sx={{ '& .MuiSvgIcon-root': { fontSize: 17.5 } }}
              name={id}
            />
          }
        />
        <Box sx={styles.boxIcons}>
          <Typography
            variant="subtitle2"
            sx={{ fontSize: '11.5px', color: '#333', pr: 1, userSelect: 'none' }}
          >
            {name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Ajustes de Capa">
              <IconButton size="small" onClick={handleOpenSettings} sx={{ p: 0.5 }}>
                <SettingsIcon sx={{ fontSize: 18, color: '#717170' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </ListItem>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleCloseSettings}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'left'
        }}
        PaperProps={{
          sx: {
            p: 2,
            width: 280,
            borderRadius: '8px',
            boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
            border: '1px solid #e0e0e0',
            overflowY: 'auto',
            maxHeight: 400
          }
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#333' }}>
          {name}
        </Typography>

        <Divider sx={{ mb: 1.5 }} />

        {/* Zoom y Reordenamiento */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>
            Vista y Orden:
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Acercar a la capa">
              <IconButton
                size="small"
                onClick={() => dispatch(actions.zoomToWmsLayer({ id }))}
                sx={{ border: '1px solid #e0e0e0' }}
              >
                <ZoomInIcon fontSize="small" sx={{ color: '#1976d2' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Subir capa">
              <span>
                <IconButton
                  size="small"
                  disabled={isFirst}
                  onClick={() => dispatch(actions.moveWmsLayer({ id, direction: 'up' }))}
                  sx={{ border: '1px solid #e0e0e0' }}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Bajar capa">
              <span>
                <IconButton
                  size="small"
                  disabled={isLast}
                  onClick={() => dispatch(actions.moveWmsLayer({ id, direction: 'down' }))}
                  sx={{ border: '1px solid #e0e0e0' }}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* Opacidad */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>
              Opacidad:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#333' }}>
              {Math.round(opacity * 100)}%
            </Typography>
          </Box>
          <Slider
            size="small"
            value={opacity}
            min={0}
            max={1}
            step={0.05}
            onChange={opacityChangeHandler}
            sx={{
              color: '#333',
              py: 1,
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12
              }
            }}
          />
        </Box>

        {/* Descargas */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" display="block" sx={{ color: '#666', fontWeight: 600, mb: 1 }}>
            Descargar datos (WFS):
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              component="a"
              href={downloadGeoJsonUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: '10px',
                py: 0.5,
                color: '#333',
                borderColor: '#ccc',
                textTransform: 'none',
                '&:hover': { borderColor: '#333', backgroundColor: '#f5f5f5' }
              }}
            >
              GeoJSON
            </Button>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              component="a"
              href={downloadShapefileUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: '10px',
                py: 0.5,
                color: '#333',
                borderColor: '#ccc',
                textTransform: 'none',
                '&:hover': { borderColor: '#333', backgroundColor: '#f5f5f5' }
              }}
            >
              Shapefile
            </Button>
          </Box>
        </Box>

        {/* Leyenda */}
        <Box>
          <Typography variant="caption" display="block" sx={{ color: '#666', fontWeight: 600, mb: 1 }}>
            Leyenda:
          </Typography>
          <Box
            sx={{
              p: 1,
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '40px',
              overflow: 'hidden'
            }}
          >
            <img
              src={legendUrl}
              alt="Leyenda"
              style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </Box>
        </Box>
      </Popover>
    </Box>
  )
}

const WmsGroup = () => {
  const wmsLayers = useSelector((state) => state.map.wmsLayers)

  if (!wmsLayers || wmsLayers.length === 0) {
    return null
  }

  return (
    <Accordion sx={styles.accordion} disableGutters defaultExpanded>
      <AccordionSummary sx={styles.accordionSummary}>
        <Typography
          variant="subtitle2"
          sx={{ ...decorators['bold'], fontSize: '12px' }}
        >
          CPUA
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ paddingLeft: '20px' }}>
        <List sx={{ padding: '0px' }}>
          {wmsLayers.map((layer, index) => (
            <WmsItem
              key={layer.id}
              {...layer}
              isFirst={index === 0}
              isLast={index === wmsLayers.length - 1}
            />
          ))}
        </List>
      </AccordionDetails>
    </Accordion>
  )
}

export default WmsGroup
