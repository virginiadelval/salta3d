import React from 'react'
import { createPortal } from 'react-dom'
import { Box, Typography, IconButton, CardMedia } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import decorators from 'theme/fontsDecorators'
import theme from 'theme'

const IfcPopUp = ({ openPopUp, setOpenPopUp }) => {
  return (
    <>
      {openPopUp &&
        createPortal(
          <Box
            sx={{
              position: 'absolute',
              zIndex: 10000,
              bgcolor: '#ffffff',
              left: '90px',
              top: '12px',
              width: { xs: '300px', sm: '510px' },
              padding: '20px',
              borderRadius: '5px',
              boxShadow: '0px 6px 20px rgba(0,0,0,0.15)'
            }}
          >
            <IconButton
              aria-label="close"
              sx={{ position: 'absolute', right: 0, top: 0 }}
              onClick={() => setOpenPopUp(false)}
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h5" sx={decorators.bold}>
              Cargar tu proyecto dentro de la ciudad
            </Typography>
            <Typography variant="body1">
              Ahora podes cargar tus proyectos dentro de la plataforma para ver
              cómo interactúan dentro de la ciudad. En el siguiente video te
              mostramos cómo
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <CardMedia
                sx={{ width: { xs: '280px', sm: '470px' } }}
                component="video"
                src={'./IFC-gif.mp4'}
                type="video/mp4"
                autoPlay
                muted
                loop
              ></CardMedia>
            </Box>
          </Box>,
          document.body
        )}
    </>
  )
}

export default IfcPopUp
