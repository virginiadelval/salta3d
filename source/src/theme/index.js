import { createTheme } from '@mui/material/styles'
import { red } from '@mui/material/colors'

const spacing = 8
const theme = createTheme({
  typography: {
    allVariants: { fontFamily: ['"Manrope"', 'sans-serif'].join(',') },
    caption: {
      letterSpacing: 0,
      fontSize: '11.5px',
      lineHeight: '17px'
    },

    h5: {
      fontFamily: ['"Montserrat"', 'sans-serif'].join(','),
      fontSize: '1.5rem',
      fontWeight: 700
    },
    subtitle1: {
      fontFamily: ['"Montserrat"', 'sans-serif'].join(','),
      fontSize: '14px',
      fontWeight: 600
    },
    subtitle2: {
      fontFamily: ['"Montserrat"', 'sans-serif'].join(','),
      fontSize: '12px',
      fontWeight: 600
    }
  },
  palette: {
    text: {
      primary: '#707070',
      secondary: '#D9D9D9',
      Info: '#00f'
    },
    action: {
      active: '#707070',
      hoverOpacity: 0.1
    },
    // primary: {
    //   main: '#EECE2F!important'
    // },
    secondary: {
      main: '#F3F3F3'
    },
    error: {
      main: red.A400
    },
    background: {
      default: '#fff'
    }
  },
  components: {
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          colorPrimary: '#fed304'
        }
      }
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#707070'
        }
      }
    },
    MuiMobileStepper: {
      styleOverrides: {
        dotActive: {
          backgroundColor: '#FFD306'
        }
      }
    },
    MuiAutocomplete: {
      styleOverrides: {
        popper: {
          '&[data-popper-placement="top"]': {
            marginBottom: '10px !important'
          }
        }
      }
    }
  },
  overrides: {
    spacing,
    MuiCssBaseline: {
      '@global': {
        html: {
          fontSize: 14,
          backgroundColor: '#ffffff'
        }
      }
    },
    MuiAccordion: {
      root: {
        marginBottom: spacing,
        border: '1px solid #D9D9D9'
      }
    },
    MuiAccordionSummary: {
      root: {
        minHeight: 0,
        '&$expanded': {
          minHeight: 0
        },
        height: spacing * 4.25
      }
    },
    MuiAccordionDetails: {
      root: {
        padding: 0
      }
    }
  }
})
export default theme
