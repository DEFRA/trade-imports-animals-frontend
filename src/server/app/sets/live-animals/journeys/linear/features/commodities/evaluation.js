import {
  feature,
  grouped
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  commodityCode,
  commodityLine,
  description,
  speciesCommonName,
  earTag,
  horseName,
  identificationDetails,
  microchip,
  numberOfAnimals,
  numberOfPackages,
  passport,
  permanentAddress,
  permanentAddressOrigin,
  speciesLatinName,
  tattoo,
  unitRecord
} from '../../../../obligations/index.js'

const line = {
  field: 'commodityLines',
  token: 'line',
  obligation: commodityLine
}

const unit = {
  field: 'animalIdentifiers',
  token: 'unit',
  obligation: unitRecord
}

const lineLeaf = (field, obligation, options = {}) =>
  grouped({ field, obligation, groups: [line], ...options })

const unitLeaf = (field, obligation) =>
  grouped({ field, obligation, groups: [line, unit] })

const toNumberWhenParses = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return value
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : value
}

export const evaluationBindings = feature('commodities', [
  lineLeaf('commodityCode', commodityCode),
  lineLeaf('speciesLatinName', speciesLatinName),
  lineLeaf('speciesCommonName', speciesCommonName),
  lineLeaf('numberOfAnimalsQuantity', numberOfAnimals, {
    convert: toNumberWhenParses
  }),
  lineLeaf('numberOfPackages', numberOfPackages),
  unitLeaf('animalIdentifierMicrochip', microchip),
  unitLeaf('animalIdentifierPassport', passport),
  unitLeaf('animalIdentifierTattoo', tattoo),
  unitLeaf('animalIdentifierEarTag', earTag),
  unitLeaf('horseName', horseName),
  unitLeaf('identificationDetails', identificationDetails),
  unitLeaf('description', description),
  unitLeaf('permanentAddress', permanentAddress),
  unitLeaf('permanentAddressOrigin', permanentAddressOrigin)
])
