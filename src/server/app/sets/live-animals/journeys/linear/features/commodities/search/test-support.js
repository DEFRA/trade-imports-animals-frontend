import {
  CATTLE_CODE,
  GOAT_CODE,
  HORSES_CODE,
  OTHER_LIVE_MAMMALS_CODE,
  SHEEP_CODE,
  SWINE_CODE
} from '../../../../../services/commodities/rules.js'
import { speciesLabel } from '../species-label.js'

export const BISON_BISON = 'Bison bison'
export const BOS_TAURUS = 'Bos taurus'
export const BUBALUS_BUBALIS = 'Bubalus bubalis'
export const CAPRA_HIRCUS = 'Capra hircus'
export const EQUUS_ASINUS = 'Equus asinus'
export const EQUUS_CABALUS = 'Equus cabalus'
export const FELIS_CATUS = 'Felis catus'
export const GALLUS_GALLUS = 'Gallus gallus'
export const MUSTELA_PUTORIUS_FURO = 'Mustela putorius furo'
export const OVIS_ARIES = 'Ovis aries'
export const STRUTHIO = 'Struthio spp.'
export const SUS_SCROFA_DOMESTICUS = 'Sus scrofa domesticus'
export const OSTRICHES_CODE = '01063300'

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

export const CAPRA_HIRCUS_ROW = {
  commodityCode: GOAT_CODE,
  speciesLatinName: CAPRA_HIRCUS,
  speciesCommonName: 'Goat'
}

export const EQUUS_ASINUS_ROW = {
  commodityCode: HORSES_CODE,
  speciesLatinName: EQUUS_ASINUS,
  speciesCommonName: 'Donkey'
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

export const OVIS_ARIES_ROW = {
  commodityCode: SHEEP_CODE,
  speciesLatinName: OVIS_ARIES,
  speciesCommonName: 'Domestic sheep'
}

export const STRUTHIO_ROW = {
  commodityCode: OSTRICHES_CODE,
  speciesLatinName: STRUTHIO,
  speciesCommonName: 'Ostriches'
}

export const SUS_SCROFA_DOMESTICUS_ROW = {
  commodityCode: SWINE_CODE,
  speciesLatinName: SUS_SCROFA_DOMESTICUS,
  speciesCommonName: 'Domestic Pig'
}

const ROWS_BY_LATIN_NAME = Object.fromEntries(
  [
    BISON_BISON_ROW,
    BOS_TAURUS_ROW,
    BUBALUS_BUBALIS_ROW,
    CAPRA_HIRCUS_ROW,
    EQUUS_ASINUS_ROW,
    EQUUS_CABALUS_ROW,
    FELIS_CATUS_ROW,
    GALLUS_GALLUS_ROW,
    MUSTELA_PUTORIUS_FURO_ROW,
    OVIS_ARIES_ROW,
    STRUTHIO_ROW,
    SUS_SCROFA_DOMESTICUS_ROW
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
