import React from 'react'

import PropTypes from 'prop-types'

import { SvgIcon, Typography, CardActionArea } from '@mui/material'

import { useDispatch, useSelector } from 'react-redux'
import { actions } from 'state/ducks/categories'
import { actions as actionsTour } from 'state/ducks/tour'
import { actions as alertsActions } from 'state/ducks/alerts'
import { sectionsAnalytics } from 'utils/reactga4'

import styles from './styles'

const Icon = ({ path, isSelected }) => (
  <SvgIcon
    sx={{
      ...styles['icon'],
      color: isSelected ? '#f96332' : 'inherit',
      width: '100%!important'
    }}
    component="div"
  >
    {path}
  </SvgIcon>
)

const Category = ({ id, path, title, url }) => {
  const sectionName = useSelector((state) =>
    state.categories.sectionId.length === 0
      ? null
      : state.categories.sectionId[0]
  )

  const dispatch = useDispatch()

  const isSelected = sectionName === id

  return (
    <CardActionArea
      data-tour={id}
      onClick={() => {
        dispatch(alertsActions.clear())
        if (id === 'Tutorial') {
          dispatch(actionsTour.isVisibleTour(true))
          return
        }
        if (url) {
          window.open(url, '_blank')
          return
        }
        dispatch(actions.categorySelected(id))
        sectionsAnalytics(title)
      }}
      sx={{
        ...styles.option,
        color: isSelected ? '#f96332' : '#a3a7ad',
        backgroundColor: isSelected ? 'rgba(249, 99, 50, 0.08)' : 'transparent',
        '&:hover': {
          color: '#f96332',
          backgroundColor: 'rgba(249, 99, 50, 0.04)'
        }
      }}
    >
      <Icon path={path} isSelected={isSelected} />
      <Typography
        variant="caption"
        sx={{
          letterSpacing: 0,
          fontSize: '11.5px',
          lineHeight: '17px',
          fontWeight: isSelected ? '700' : '400'
        }}
      >
        {title}
      </Typography>
    </CardActionArea>
  )
}

Category.propTypes = {
  id: PropTypes.string.isRequired,
  path: PropTypes.objectOf(PropTypes.any).isRequired,
  url: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired
}

Icon.propTypes = {
  path: PropTypes.objectOf(PropTypes.any).isRequired,
  isSelected: PropTypes.bool.isRequired
}

export default Category
