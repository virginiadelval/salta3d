import React from 'react'

import ContainerBar from 'components/Sections/ContainerBar'
import { getNormative } from 'utils/configQueries'

import InfoCard from './InfoCard'

const Normative = () => (
  <ContainerBar type="list">
    {getNormative().map(({ id, title, description, color, link }) => (
      <InfoCard key={id} id={id} title={title} description={description} color={color} link={link} />
    ))}
  </ContainerBar>
)

export default Normative
