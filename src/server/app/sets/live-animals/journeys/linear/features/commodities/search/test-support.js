import {
  CATTLE_CODE,
  HORSES_CODE,
  OTHER_LIVE_MAMMALS_CODE
} from '../../../../../services/commodities/rules.js'

export const BISON_BISON = 'Bison bison'
export const BOS_TAURUS = 'Bos taurus'
export const BUBALUS_BUBALIS = 'Bubalus bubalis'
export const EQUUS_CABALUS = 'Equus cabalus'
export const FELIS_CATUS = 'Felis catus'
export const GALLUS_GALLUS = 'Gallus gallus'
export const MUSTELA_PUTORIUS_FURO = 'Mustela putorius furo'
export const STRUTHIO = 'Struthio spp.'
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

const LABELS_BY_LATIN_NAME = {
  [BISON_BISON]: 'Bison bison (American Bison)',
  [BOS_TAURUS]: 'Bos taurus (Domestic Cattle)',
  [BUBALUS_BUBALIS]: 'Bubalus bubalis (Water Buffalo)',
  [EQUUS_CABALUS]: 'Equus cabalus (Horse)',
  [FELIS_CATUS]: 'Felis catus (Domestic Cat)',
  [GALLUS_GALLUS]: 'Gallus gallus (Chicken)',
  [MUSTELA_PUTORIUS_FURO]: 'Mustela putorius furo (Ferret)',
  [STRUTHIO]: 'Struthio spp. (Ostriches)'
}

export const labelFor = (speciesLatinName) =>
  LABELS_BY_LATIN_NAME[speciesLatinName]

export const lineOf = (row, extra = {}) => ({
  ...row,
  numberOfPackages: '',
  numberOfAnimalsQuantity: '',
  ...extra
})
