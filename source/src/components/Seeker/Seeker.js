import React, { useState, useCallback } from 'react'

import {
  Box,
  Avatar,
  InputBase,
  ListItemAvatar,
  ListItemText,
  ListItem,
  ListItemButton,
  Paper
} from '@mui/material'
import PlaceIcon from '@mui/icons-material/Place'
import SearchIcon from '@mui/icons-material/Search'
import StarIcon from '@mui/icons-material/Star'

import Downshift from 'downshift'

import PropTypes from 'prop-types'

import styles from './styles'
import useDebounce from '../../hooks/useDebounce'

const Seeker = ({ onSelectItem }) => {
  const [suggestions, setSuggestions] = useState([])
  const { debounce } = useDebounce()

  const handleNewAutocompleter = async (text) => {
    if (!text || text.trim().length < 3) {
      setSuggestions([])
      return
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          text
        )}&format=json&addressdetails=1&limit=10&bounded=1&viewbox=-65.57,-24.69,-65.31,-24.93`
      )
      const data = await response.json()

      if (!data || data.length === 0) {
        setSuggestions([
          {
            type: 'tipoalerta',
            title: 'No se hallaron resultados coincidentes'
          }
        ])
        return
      }

      const mappedSuggestions = data.map((item) => {
        let title = item.display_name
        if (item.address) {
          const mainName =
            item.address.road ||
            item.address.pedestrian ||
            item.address.amenity ||
            item.address.building ||
            item.name
          if (mainName) {
            title = [mainName, item.address.house_number]
              .filter(Boolean)
              .join(' ')
          }
        }
        return {
          type: 'address',
          title: title,
          value: title,
          subTitle: item.display_name,
          data: {
            smp: '',
            coordenadas: { x: parseFloat(item.lon), y: parseFloat(item.lat) }
          }
        }
      })

      setSuggestions(mappedSuggestions)
    } catch (error) {
      console.error('Error loading suggestions from Nominatim:', error)
      setSuggestions([
        {
          type: 'tipoalerta',
          title: 'Error de conexión al buscar la dirección'
        }
      ])
    }
  }

  const handleSearch = useCallback(
    debounce((text) => handleNewAutocompleter(text), 750),
    []
  )

  const handleSelectItem = (selectedSuggestion) => {
    if (selectedSuggestion && selectedSuggestion.type !== 'tipoalerta') {
      setSuggestions([])
      onSelectItem(selectedSuggestion)
    } else {
      setSuggestions([])
    }
  }

  const handleInputBlur = () => {
    // Retrasar el borrado de sugerencias para permitir el evento onClick del listado
    setTimeout(() => {
      setSuggestions([])
    }, 200)
  }

  const renderInput = (props) => {
    const { inputProps, styles: StyleClass, ...other } = props
    const direcciónMasLarga = '125'
    return (
      <InputBase
        sx={StyleClass.input}
        inputProps={{
          ...inputProps,
          maxLength: direcciónMasLarga
        }}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...other}
      />
    )
  }

  const renderSuggestion = (suggestionProps) => {
    const { suggestion, index, itemProps, highlightedIndex } = suggestionProps

    const title =
      suggestion.alias ||
      suggestion.title ||
      suggestion.nombre ||
      suggestion.value
    const subTitle = suggestion.subTitle
      ? suggestion.subTitle
      : suggestion.descripcion
    const Icono = suggestion.title ? PlaceIcon : StarIcon

    const isHighlighted = highlightedIndex === index

    return (
      <ListItem
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...itemProps}
        key={index}
        component="div"
        sx={styles.list}
        disablePadding
      >
        <ListItemButton selected={isHighlighted}>
          <ListItemAvatar>
            <Avatar>
              <Icono fontSize="small" />
            </Avatar>
          </ListItemAvatar>
          <ListItemText primary={title} secondary={subTitle} />
        </ListItemButton>
      </ListItem>
    )
  }

  return (
    <Box>
      <Downshift
        id="salta-autocomplete"
        onSelect={handleSelectItem}
        itemToString={(item) => item?.value || ''}
        initialHighlightedIndex={0}
        defaultHighlightedIndex={0}
      >
        {({
          getInputProps,
          getItemProps,
          getMenuProps,
          highlightedIndex,
          selectedItem
        }) => {
          const { onBlur, onFocus, ...inputProps } = getInputProps({
            placeholder: 'Buscar dirección en Salta...',
            onChange: (e) => {
              handleSearch(e.target.value)
            }
          })

          return (
            <div>
              <Paper sx={styles.root} data-tour="search-bar">
                <SearchIcon sx={{ marginLeft: '5px' }} />
                {renderInput({
                  styles,
                  inputProps,
                  onBlur: handleInputBlur
                })}
              </Paper>

              <Box
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...getMenuProps()}
                sx={styles.menuBox}
              >
                {suggestions.length !== 0 ? (
                  <Paper sx={styles.paper} square>
                    {suggestions.map((suggestion, index) => {
                      return renderSuggestion({
                        suggestion,
                        index,
                        itemProps: getItemProps({ item: suggestion }),
                        highlightedIndex,
                        selectedItem
                      })
                    })}
                  </Paper>
                ) : null}
              </Box>
            </div>
          )
        }}
      </Downshift>
    </Box>
  )
}

Seeker.propTypes = {
  onSelectItem: PropTypes.func.isRequired
}

export default Seeker
