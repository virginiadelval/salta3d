import React from 'react'
import { useSelector } from 'react-redux'
import { Box, Typography, CircularProgress } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import DomainIcon from '@mui/icons-material/Domain'

import decorators from 'theme/fontsDecorators'
import ContainerBar from 'components/Sections/ContainerBar'
import SelectParcel from 'components/Sections/SubSection/SelectParcel'

const DetailRow = ({ label, value, unit, highlight }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
    <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.6)', fontWeight: '500' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: highlight ? 'bold' : '600', color: highlight ? '#004174' : '#2c3e50' }}>
      {value} {unit || ''}
    </Typography>
  </Box>
)

const Buildable = () => {
  const smp = useSelector((state) => state.parcel.smp)
  const basicData = useSelector((state) => state.basicData.data)
  const isBasicDataLoading = useSelector((state) => state.basicData.isLoading)

  if (!smp) {
    return (
      <ContainerBar type="list">
        <SelectParcel />
      </ContainerBar>
    )
  }

  if (isBasicDataLoading) {
    return (
      <ContainerBar type="list">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
      </ContainerBar>
    )
  }

  // Extract variables
  const supParcelaRaw = basicData.superficie_parcela
  const supParcela = supParcelaRaw ? Number.parseFloat(supParcelaRaw) : null

  const regimen = basicData.regimen

  // Parse FOS
  let fosVal = 0.7
  if (regimen) {
    if (regimen.fos !== undefined && regimen.fos !== null && !Number.isNaN(Number.parseFloat(regimen.fos))) {
      fosVal = Number.parseFloat(regimen.fos)
    } else if (regimen.fos_vu !== undefined && regimen.fos_vu !== null && !Number.isNaN(Number.parseFloat(regimen.fos_vu))) {
      fosVal = Number.parseFloat(regimen.fos_vu)
    }
  } else if (basicData.zoning_fos !== undefined && basicData.zoning_fos !== 'N/A') {
    fosVal = Number.parseFloat(basicData.zoning_fos)
  }
  // If FOS was parsed as percentage (e.g. 70), normalize it to 0.70
  if (fosVal > 1) {
    fosVal = fosVal / 100
  }

  // Parse FOT
  let fotPriv = 3.0
  if (regimen && regimen.fot_privado !== undefined && regimen.fot_privado !== null && !Number.isNaN(Number.parseFloat(regimen.fot_privado))) {
    fotPriv = Number.parseFloat(regimen.fot_privado)
  } else if (basicData.zoning_fot_privado !== undefined && basicData.zoning_fot_privado !== 'N/A') {
    fotPriv = Number.parseFloat(basicData.zoning_fot_privado)
  }

  let fotPub = 4.5
  if (regimen && regimen.fot_publico !== undefined && regimen.fot_publico !== null && !Number.isNaN(Number.parseFloat(regimen.fot_publico))) {
    fotPub = Number.parseFloat(regimen.fot_publico)
  } else if (basicData.zoning_fot_publico !== undefined && basicData.zoning_fot_publico !== 'N/A') {
    fotPub = Number.parseFloat(basicData.zoning_fot_publico)
  }

  const alturaMaxStr = regimen?.altura_maxima || basicData.zoning_altura_m || 'N/A'

  // Calculations
  const formatNum = (num) => num !== null && num !== undefined ? num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'

  const supPB = supParcela ? supParcela * fosVal : null
  const supMaxPrivada = supParcela ? supParcela * fotPriv : null
  const supMaxPublica = supParcela ? supParcela * fotPub : null
  const pisosTeoricos = fosVal > 0 ? Math.round(fotPriv / fosVal) : 'N/A'

  return (
    <ContainerBar type="list">
      <Box sx={{ p: 2 }}>
        {/* Header Summary */}
        <Box sx={{ mb: 3, p: 2.5, backgroundColor: '#f9fafb', borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <Typography variant="h6" sx={[decorators.bold, { color: '#004174', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }]}>
            <DomainIcon /> Potencial Constructivo
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.6)', fontWeight: '600' }}>
            SMP Activo: {smp}
          </Typography>
          {supParcela ? (
            <Typography variant="subtitle2" sx={{ color: '#2c3e50', mt: 0.5, fontWeight: '700' }}>
              Superficie Catastral: {formatNum(supParcela)} m²
            </Typography>
          ) : (
            <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              <InfoOutlinedIcon fontSize="inherit" /> Superficie catastral no disponible en esta parcela para cálculos.
            </Typography>
          )}
        </Box>

        {/* Indicadores Base de la Normativa */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#004174', borderBottom: '2px solid #004174', pb: 0.5, mb: 1.5 }}>
            Indicadores Base (CPUA)
          </Typography>
          <DetailRow label="F.O.S. (Factor de Ocupación del Suelo)" value={fosVal.toFixed(2)} unit={`(${Math.round(fosVal*100)}%)`} />
          <DetailRow label="F.O.T. Privado (Básico)" value={fotPriv.toFixed(2)} />
          <DetailRow label="F.O.T. Público (Con Bonificación)" value={fotPub.toFixed(2)} />
          <DetailRow label="Altura Máxima Normativa" value={alturaMaxStr} />
        </Box>

        {/* Potencial Calculado */}
        {supParcela && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#004174', borderBottom: '2px solid #004174', pb: 0.5, mb: 1.5 }}>
              Capacidad Edificable Calculada
            </Typography>
            <DetailRow label="Sup. Máxima Ocupable en Planta Baja" value={formatNum(supPB)} unit="m²" />
            <DetailRow label="Pisos Teóricos Estimados" value={pisosTeoricos} unit="pisos" />
            <DetailRow label="Superficie Edificable Privada Máxima" value={formatNum(supMaxPrivada)} unit="m²" highlight />
            <DetailRow label="Superficie Edificable Pública Máxima" value={formatNum(supMaxPublica)} unit="m²" highlight />

            <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff8e1', borderRadius: 2, border: '1px solid rgba(255, 179, 0, 0.2)' }}>
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: '700', color: '#b78103', mb: 0.5 }}>
                <InfoOutlinedIcon fontSize="inherit" /> Nota de Estimación
              </Typography>
              <Typography variant="caption" sx={{ color: '#5d4037', display: 'block', lineHeight: 1.3 }}>
                El potencial constructivo total se estima en un rango de <strong>{formatNum(supMaxPrivada)} m²</strong> (privado/básico) hasta <strong>{formatNum(supMaxPublica)} m²</strong> (público con incentivos por transferencia de edificabilidad), sujeto a las restricciones de retiros de fondo, jardín, patrimonio arquitectónico y perfil regulador.
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </ContainerBar>
  )
}

export default Buildable
