import * as commodities from '../../services/commodities/index.js'

export const commoditySelection = {
  id: 'commoditySelection',
  required: true,
  enforcedAt: 'continue'
}

export const typeSelection = { id: 'typeSelection', required: true }

export const speciesSelection = { id: 'speciesSelection', required: true }

export const numberOfPackages = {
  id: 'numberOfPackages',
  activatedBy: {
    obligation: commoditySelection,
    includes: commodities.packageCountCommodities()
  },
  wipeOnExit: true
}

export const numberOfAnimalsQuantity = {
  id: 'numberOfAnimalsQuantity',
  required: true
}

const enclosingCommodity = (includes) => ({
  obligation: commoditySelection,
  frame: 'enclosing',
  includes
})

export const animalIdentifierPassport = {
  id: 'animalIdentifierPassport',
  activatedBy: enclosingCommodity(commodities.passportCommodities()),
  wipeOnExit: true
}

export const animalIdentifierTattoo = {
  id: 'animalIdentifierTattoo',
  activatedBy: enclosingCommodity(commodities.tattooCommodities()),
  wipeOnExit: true
}

export const animalIdentifierEarTag = {
  id: 'animalIdentifierEarTag',
  activatedBy: enclosingCommodity(commodities.earTagCommodities()),
  wipeOnExit: true
}

export const horseName = {
  id: 'horseName',
  activatedBy: enclosingCommodity(commodities.horseNameCommodities()),
  wipeOnExit: true
}

export const TYPED_ANIMAL_IDENTIFIERS = [
  animalIdentifierPassport,
  animalIdentifierTattoo,
  animalIdentifierEarTag,
  horseName
]

const enclosingCommodityNotInUnionOf = (obligations) => ({
  obligation: commoditySelection,
  frame: 'enclosing',
  notInUnionOf: obligations
})

export const animalIdentifierIdentificationDetails = {
  id: 'animalIdentifierIdentificationDetails',
  activatedBy: enclosingCommodityNotInUnionOf(TYPED_ANIMAL_IDENTIFIERS),
  wipeOnExit: true
}

export const animalIdentifierDescription = {
  id: 'animalIdentifierDescription',
  activatedBy: enclosingCommodityNotInUnionOf(TYPED_ANIMAL_IDENTIFIERS),
  wipeOnExit: true
}

export const permanentAddress = {
  id: 'permanentAddress',
  required: true,
  activatedBy: enclosingCommodity(commodities.permanentAddressCommodities()),
  wipeOnExit: true
}

export const ANIMAL_IDENTIFIER_GROUP = [
  animalIdentifierPassport.id,
  animalIdentifierTattoo.id,
  animalIdentifierEarTag.id,
  horseName.id,
  animalIdentifierIdentificationDetails.id,
  animalIdentifierDescription.id
]

export const animalIdentifiers = {
  id: 'animalIdentifiers',
  collection: true,
  item: [
    animalIdentifierPassport,
    animalIdentifierTattoo,
    animalIdentifierEarTag,
    horseName,
    animalIdentifierIdentificationDetails,
    animalIdentifierDescription,
    permanentAddress
  ],
  requiredAtLeastOne: true,
  requiredOneOf: ANIMAL_IDENTIFIER_GROUP
}

export const commodityLines = {
  id: 'commodityLines',
  collection: true,
  item: [
    commoditySelection,
    typeSelection,
    speciesSelection,
    numberOfPackages,
    numberOfAnimalsQuantity,
    animalIdentifiers
  ],
  requiredAtLeastOne: true
}

export const obligations = [commodityLines]
