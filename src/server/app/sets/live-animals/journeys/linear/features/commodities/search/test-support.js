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
export const CANIS_FAMILIARIS = 'Canis familiaris'
export const STRUTHIO = 'Struthio'
export const OSTRICHES_CODE = '01063300'
export const CATTLE_OR_COW = 'Cattle or Cow'

export const BISON_BISON_ROW = {
  commodityCode: CATTLE_CODE,
  speciesLatinName: BISON_BISON,
  speciesCommonName: 'Bisons Spp'
}

export const BOS_TAURUS_ROW = {
  commodityCode: CATTLE_CODE,
  speciesLatinName: BOS_TAURUS,
  speciesCommonName: CATTLE_OR_COW
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

export const CANIS_FAMILIARIS_ROW = {
  commodityCode: OTHER_LIVE_MAMMALS_CODE,
  speciesLatinName: CANIS_FAMILIARIS,
  speciesCommonName: 'Dog'
}

export const STRUTHIO_ROW = {
  commodityCode: OSTRICHES_CODE,
  speciesLatinName: STRUTHIO,
  speciesCommonName: 'Ostriches'
}

const LABELS_BY_LATIN_NAME = {
  [BISON_BISON]: 'Bison bison (Bisons Spp)',
  [BOS_TAURUS]: 'Bos taurus (Cattle or Cow)',
  [BUBALUS_BUBALIS]: 'Bubalus bubalis (Water Buffalo)',
  [EQUUS_CABALUS]: 'Equus cabalus (Horse)',
  [FELIS_CATUS]: 'Felis catus (Domestic Cat)',
  [CANIS_FAMILIARIS]: 'Canis familiaris (Dog)',
  [STRUTHIO]: 'Struthio (Ostriches)'
}

export const labelFor = (speciesLatinName) =>
  LABELS_BY_LATIN_NAME[speciesLatinName]

export const lineOf = (row, extra = {}) => ({
  ...row,
  numberOfPackages: '',
  numberOfAnimalsQuantity: '',
  ...extra
})
