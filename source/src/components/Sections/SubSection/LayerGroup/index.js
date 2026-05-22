import React from 'react'

import { getLayersGroups } from 'utils/configQueries'

import ContainerBar from 'components/Sections/ContainerBar'
import Group from './Group'
import WmsGroup from './WmsGroup'

const LayerGroup = () => (
  <ContainerBar type="list">
    <WmsGroup />
  </ContainerBar>
)

export default LayerGroup
