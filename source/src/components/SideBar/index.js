import React, { useState, useEffect } from 'react'

import { Box, Drawer } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { useSelector } from 'react-redux'

import Categories from 'components/Categories/Categories'
import Logo from 'components/Logo/Logo'
import { getCategories } from 'utils/configQueries'

const ConnectedPanel = () => {
  const isMapReady = useSelector((state) => state.map.isMapReady)

  const [data, setData] = useState([])
  useEffect(() => {
    if (isMapReady) {
      setData(getCategories())
    }
  }, [isMapReady])

  const theme = useTheme()

  const styles = {
    sideBarPaper: {
      width: theme.spacing(9.75),
      background: '#1d2126'
    },
    logo: {
      marginTop: theme.spacing(1)
    }
  }
  return (
    <Drawer
      variant="persistent"
      open
      PaperProps={{ elevation: 8, sx: styles.sideBarPaper }}
    >
      <Box sx={styles.logo}>
        <Logo />
      </Box>
      <Categories data={data} />
    </Drawer>
  )
}

export default ConnectedPanel
