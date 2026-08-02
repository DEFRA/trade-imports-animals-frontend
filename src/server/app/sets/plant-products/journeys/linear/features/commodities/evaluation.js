import {
  feature,
  grouped,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { commodityInputMethod } from '../../../../obligations/index.js'
import {
  commodityLines,
  commoditySelection,
  controlledAtmosphereContainer,
  finishedOrPropagated,
  intendedForFinalUsers,
  netWeight,
  numberOfPackages,
  packageType,
  quantity,
  quantityType,
  testAndTrial
} from '../../../../obligations/sections/commodities/lines.js'
import {
  eppoCode,
  genusAndSpecies,
  species,
  speciesId
} from '../../../../obligations/sections/commodities/species.js'
import {
  varieties,
  variety,
  varietyClass
} from '../../../../obligations/sections/commodities/varieties.js'

export const lineGroup = {
  field: 'commodityLines',
  token: 'line',
  obligation: commodityLines
}

export const speciesGroup = {
  field: 'species',
  token: 'species',
  obligation: species
}

export const varietyGroup = {
  field: 'varieties',
  token: 'variety',
  obligation: varieties
}

const lineLeaf = (field, obligation) =>
  grouped({ field, obligation, groups: [lineGroup] })

const speciesLeaf = (field, obligation) =>
  grouped({ field, obligation, groups: [lineGroup, speciesGroup] })

const varietyLeaf = (field, obligation) =>
  grouped({
    field,
    obligation,
    groups: [lineGroup, speciesGroup, varietyGroup]
  })

export const evaluationBindings = feature('commodities', [
  lineLeaf('commoditySelection', commoditySelection),
  lineLeaf('numberOfPackages', numberOfPackages),
  lineLeaf('packageType', packageType),
  lineLeaf('quantity', quantity),
  lineLeaf('quantityType', quantityType),
  lineLeaf('netWeight', netWeight),
  lineLeaf('controlledAtmosphereContainer', controlledAtmosphereContainer),
  lineLeaf('finishedOrPropagated', finishedOrPropagated),
  lineLeaf('intendedForFinalUsers', intendedForFinalUsers),
  lineLeaf('testAndTrial', testAndTrial),
  speciesLeaf('eppoCode', eppoCode),
  speciesLeaf('genusAndSpecies', genusAndSpecies),
  speciesLeaf('speciesId', speciesId),
  varietyLeaf('variety', variety),
  varietyLeaf('varietyClass', varietyClass)
])

export const inputMethodBindings = feature('commodities', [
  scalar({ field: 'commodityInputMethod', obligation: commodityInputMethod })
])
