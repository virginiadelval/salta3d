import React from 'react'
import { Box, Typography } from '@mui/material'
import ContainerBar from 'components/Sections/ContainerBar'
import decorators from 'theme/fontsDecorators'

const Transfer = () => {
  return (
    <ContainerBar type="table">
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <Typography variant="h6" color="primary" sx={{ ...decorators.bold, mb: 2 }}>
          Transferencia de Potencial Constructivo
        </Typography>
        <Typography variant="body1" align="center" color="textSecondary">
          Esta sección se encuentra en desarrollo. Próximamente estará disponible la información y herramientas para la gestión de transferencia de capacidad edificable.
        </Typography>
      </Box>
    </ContainerBar>
  )
}

export default Transfer
