import React from 'react'
import { createPortal } from 'react-dom'
import { Box, Typography, IconButton, Link } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import decorators from 'theme/fontsDecorators'
import theme from 'theme'

const LeyPopUp = ({ openPopUp, setOpenPopUp }) => {
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
            <Typography variant="body1">
            La información correspondiente a volumetrías y usos se encuentra en proceso de actualización según la nueva normativa vigente. Puedes consultar más detalles en la sección de Normativas.
            </Typography>
          </Box>,
          document.body
        )}
    </>
  )
}

export default LeyPopUp