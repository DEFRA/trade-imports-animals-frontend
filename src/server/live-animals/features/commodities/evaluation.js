import { feature, grouped } from '../../bridge/fulfilment-bindings.js'
import {
  commodityCode,
  commodityLine,
  commodityType,
  description,
  earTag,
  horseName,
  identificationDetails,
  numberOfAnimals,
  numberOfPackages,
  passport,
  permanentAddress,
  species,
  tattoo,
  unitRecord
} from '../../model/obligations/obligations.js'

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
  if (typeof value !== 'string' || value.trim() === '') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : value
}

export const evaluationBindings = feature('commodities', [
  lineLeaf('commoditySelection', commodityCode),
  lineLeaf('commodityType', commodityType),
  lineLeaf('speciesSelection', species),
  lineLeaf('numberOfAnimalsQuantity', numberOfAnimals, {
    convert: toNumberWhenParses
  }),
  lineLeaf('numberOfPackages', numberOfPackages),
  unitLeaf('animalIdentifierPassport', passport),
  unitLeaf('animalIdentifierTattoo', tattoo),
  unitLeaf('animalIdentifierEarTag', earTag),
  unitLeaf('horseName', horseName),
  unitLeaf('animalIdentifierIdentificationDetails', identificationDetails),
  unitLeaf('animalIdentifierDescription', description),
  unitLeaf('permanentAddress', permanentAddress)
])
