import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import {
  getBuildable,
  getEnrase,
  getPlusvalia,
  getPdfLink
} from 'utils/apiConfig'
import { actions as alertsActions } from 'state/ducks/alerts'
import { getAffectationsTableNoAsync } from 'utils/configQueries'
import { UNIDAD_EDIFICABILIDAD } from 'utils/unidadesEdificabilidad'

const areaChanged = createAsyncThunk(
  'buildable/areaChanged',
  async ({ smp, text }) => {
    const area = Number.parseFloat(text)
    if (Number.isNaN(area) || !smp || smp.length === 0) {
      return {
        plusvalia: {
          plusvalia_em: '-',
          plusvalia_pl: '-',
          plusvalia_sl: '-'
        }
      }
    }
    const url = getPlusvalia(smp, area)
    const data = await fetch(url)
      .then((response) => response.json())
      .then(
        ({
          plusvalia_em: em,
          plusvalia_pl: pl,
          plusvalia_sl: sl,
          alicuota: al,
          incidencia_uva: uva,
          distrito_cpu: cpu
        }) => ({
          plusvalia_em: em === 0 ? 0 : em.toLocaleString('es-AR'),
          plusvalia_pl: pl === 0 ? 0 : pl.toLocaleString('es-AR'),
          plusvalia_sl: sl === 0 ? 0 : sl.toLocaleString('es-AR'),
          alicuota: al === 0 ? 0 : al.toLocaleString('es-AR'),
          incidencia_uva: uva === 0 ? 0 : uva.toLocaleString('es-AR'),
          distrito_cpu: cpu
        })
      )
    return {
      plusvalia: data
    }
  }
)

const getAffectations = (afectaciones) => {
  const afectacionesFiltrado = Object.entries(afectaciones)
    .filter(([, value]) => value !== 0)
    .map(([key]) => key)

  const affectationsTable = getAffectationsTableNoAsync()
  const data = afectacionesFiltrado
    .map((id) => affectationsTable.find((at) => at.id === id))
    .filter((d) => d !== undefined)
  return data
}

const getDataBuild = (url) =>
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const afectaciones = getAffectations(data.afectaciones)

      return { ...data, afectaciones }
    })
    .then(
      ({
        altura_max: alturas,
        fot: {
          fot_medianera: medianera,
          fot_perim_libre: perim,
          fot_semi_libre: semi
        },
        plusvalia: {
          // eslint-disable-next-line no-unused-vars
          plusvalia_em: em,
          // eslint-disable-next-line no-unused-vars
          plusvalia_pl: pl,
          // eslint-disable-next-line no-unused-vars
          plusvalia_sl: sl,
          alicuota: al,
          incidencia_uva: uva,
          distrito_cpu: cpu
        },
        sup_max_edificable: supMax,
        sup_edificable_planta: supPlanta,
        ...others
      }) => {
        const alturasAux = alturas
          .filter((altura) => altura > 0)
          .map((altura) => altura.toLocaleString('es-AR'))
        return {
          altura_max: alturasAux.length === 0 ? [0] : alturasAux,
          fot: {
            fot_medianera: medianera.toLocaleString('es-AR'),
            fot_perim_libre: perim.toLocaleString('es-AR'),
            fot_semi_libre: semi.toLocaleString('es-AR'),
            total: medianera + perim + semi
          },
          plusvalia: {
            plusvalia_em: 0,
            plusvalia_pl: 0,
            plusvalia_sl: 0,
            alicuota: al === 0 ? 0 : al.toLocaleString('es-AR'),
            incidencia_uva: uva === 0 ? 0 : uva,
            distrito_cpu: cpu
          },
          sup_max_edificable: supMax.toLocaleString('es-AR'),
          sup_edificable_planta: supPlanta.toLocaleString('es-AR'),
          // Por el Ticket 2863 se ignora supPlanta y se deja en cero
          // sup_edificable_planta: 0,
          ...others
        }
      }
    )

const clickOnParcel = createAsyncThunk(
  'buildable/clickOnParcel',
  async (smp, { dispatch }) => {
    dispatch(alertsActions.clear())
    return {}
  }
)

const buildable = createSlice({
  name: 'buildable',
  initialState: {
    isLoading: false,
    lastIDCAll: '',
    data: {},
    plusvalia: {},
    isSelected: false
  },
  extraReducers: {
    [areaChanged.fulfilled]: (draftState, action) => {
      draftState.plusvalia = action.payload
      draftState.isLoading = false
    },
    [clickOnParcel.pending]: (draftState) => {
      draftState.isLoading = true
      draftState.data = {}
      draftState.isSelected = false
    },
    [clickOnParcel.fulfilled]: (draftState, action) => {
      draftState.data = action.payload
      draftState.isLoading = false
      draftState.isSelected = true
    },
    [clickOnParcel.rejected]: (draftState) => {
      draftState.isLoading = false
      draftState.data = {}
      draftState.isSelected = false
    }
  }
})

export default buildable.reducer

const actions = { ...buildable.actions, clickOnParcel, areaChanged }
export { actions }
