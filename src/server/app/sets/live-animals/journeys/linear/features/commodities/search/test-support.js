import {
  CATTLE_CODE,
  HORSES_CODE,
  OTHER_LIVE_MAMMALS_CODE
} from '../../../../../services/commodities/rules.js'

export const BISON_BISON = 'Bison bison'
export const BOS_TAURUS = 'Bos taurus'
export const EQUUS_CABALUS = 'Equus cabalus'
export const FELIS_CATUS = 'Felis catus'
export const NYCTEREUTES_PROCYONOIDES = 'Nyctereutes procyonoides'
export const EQUUS_ZEBRA = 'Equus zebra'
export const STRUTHIO = 'Struthio'
export const OSTRICHES_CODE = '01063300'
export const DOMESTIC_CATTLE = 'Domestic Cattle'

export const BISON_BISON_ROW = {
  commodityCode: CATTLE_CODE,
  speciesLatinName: BISON_BISON,
  speciesCommonName: 'Bisons Spp'
}

export const BOS_TAURUS_ROW = {
  commodityCode: CATTLE_CODE,
  speciesLatinName: BOS_TAURUS,
  speciesCommonName: DOMESTIC_CATTLE
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

export const RACCOON_DOG_ROW = {
  commodityCode: OTHER_LIVE_MAMMALS_CODE,
  speciesLatinName: NYCTEREUTES_PROCYONOIDES,
  speciesCommonName: 'Raccoon Dog'
}

export const EQUUS_ZEBRA_ROW = {
  commodityCode: HORSES_CODE,
  speciesLatinName: EQUUS_ZEBRA,
  speciesCommonName: 'Mountain Zebra'
}

export const STRUTHIO_ROW = {
  commodityCode: OSTRICHES_CODE,
  speciesLatinName: STRUTHIO,
  speciesCommonName: 'Ostriches'
}

export const lineOf = (row, extra = {}) => ({
  ...row,
  numberOfPackages: '',
  numberOfAnimalsQuantity: '',
  ...extra
})
