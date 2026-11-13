import {
  CATTLE_CODE,
  HORSES_CODE,
  OTHER_LIVE_MAMMALS_CODE
} from '../../../../../services/commodities/rules.js'
import { speciesLabel } from '../species-label.js'

export const BISON_BISON = 'Bison bison'
export const BOS_TAURUS = 'Bos taurus'
export const BUBALUS_BUBALIS = 'Bubalus bubalis'
export const EQUUS_CABALUS = 'Equus cabalus'
export const FELIS_CATUS = 'Felis catus'
export const GALLUS_GALLUS = 'Gallus gallus'
export const MUSTELA_PUTORIUS_FURO = 'Mustela putorius furo'
export const STRUTHIO = 'Struthio spp.'
export const OSTRICHES_CODE = '01063300'
export const CATTLE_HEADING = `Cattle (${CATTLE_CODE})`

export const BISON_BISON_ROW = {
  commodityCode: CATTLE_CODE,
  speciesLatinName: BISON_BISON,
  speciesCommonName: 'American Bison'
}

export const BOS_TAURUS_ROW = {
  commodityCode: CATTLE_CODE,
  speciesLatinName: BOS_TAURUS,
  speciesCommonName: 'Domestic Cattle'
}

export const BUBALUS_BUBALIS_ROW = {
  commodityCode: CATTLE_CODE,
  speciesLatinName: BUBALUS_BUBALIS,
  speciesCommonName: 'Water Buffalo'
}

export const EQUUS_CABALUS_ROW = {
  commodityCode: HORSES_CODE,
  speciesLatinName: EQUUS_CABALUS,
  speciesCommonName: 'Horse'
}

export const FELIS_CATUS_ROW = {
  commodityCode: OTHER_LIVE_MAMMALS_CODE,
  speciesLatinName: FELIS_CATUS,
  speciesCommonName: 'Domestic Cat'
}

export const GALLUS_GALLUS_ROW = {
  commodityCode: '01051111',
  speciesLatinName: GALLUS_GALLUS,
  speciesCommonName: 'Chicken'
}

export const MUSTELA_PUTORIUS_FURO_ROW = {
  commodityCode: OTHER_LIVE_MAMMALS_CODE,
  speciesLatinName: MUSTELA_PUTORIUS_FURO,
  speciesCommonName: 'Ferret'
}

export const STRUTHIO_ROW = {
  commodityCode: OSTRICHES_CODE,
  speciesLatinName: STRUTHIO,
  speciesCommonName: 'Ostriches'
}

const ROWS_BY_LATIN_NAME = Object.fromEntries(
  [
    BISON_BISON_ROW,
    BOS_TAURUS_ROW,
    BUBALUS_BUBALIS_ROW,
    EQUUS_CABALUS_ROW,
    FELIS_CATUS_ROW,
    GALLUS_GALLUS_ROW,
    MUSTELA_PUTORIUS_FURO_ROW,
    STRUTHIO_ROW
  ].map((row) => [row.speciesLatinName, row])
)

export const labelFor = (speciesLatinName) => {
  const row = ROWS_BY_LATIN_NAME[speciesLatinName]
  if (!row) {
    throw new Error(`No test row carries the Latin name "${speciesLatinName}"`)
  }
  return speciesLabel(row)
}

export const lineOf = (row, extra = {}) => ({
  ...row,
  numberOfPackages: '',
  numberOfAnimalsQuantity: '',
  ...extra
})
