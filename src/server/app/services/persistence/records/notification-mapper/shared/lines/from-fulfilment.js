import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact } from '../compact.js'

const legacyAnimalCount = (value) =>
  typeof value === 'number' ? String(value) : value

const unitFrom = (valueAt, identifiers, unitIndex) =>
  compact({
    animalIdentifierMicrochip: valueAt(identifiers.microchip, unitIndex),
    animalIdentifierPassport: valueAt(identifiers.passport, unitIndex),
    animalIdentifierTattoo: valueAt(identifiers.tattoo, unitIndex),
    animalIdentifierEarTag: valueAt(identifiers.earTag, unitIndex),
    horseName: valueAt(identifiers.horseName, unitIndex),
    animalIdentifierIdentificationDetails: valueAt(
      identifiers.identificationDetails,
      unitIndex
    ),
    animalIdentifierDescription: valueAt(identifiers.description, unitIndex),
    permanentAddress: valueAt(identifiers.permanentAddress, unitIndex)
  })

// One logical line/unit join over the independent canonical record maps.
// Line and unit identity comes only from exact fulfilment indexes; a leaf
// is joined only when its record map contains that exact fulfilment index.
export const commodityLinesFromFulfilment = (reader) => {
  const {
    commodityCode,
    commodityLine,
    commodityType,
    description,
    earTag,
    horseName,
    identificationDetails,
    microchip,
    numberOfAnimals,
    numberOfPackages,
    passport,
    permanentAddress,
    species,
    tattoo,
    unitRecord
  } = obligationSet()
  const identifierObligations = [
    microchip,
    passport,
    tattoo,
    earTag,
    horseName,
    identificationDetails,
    description,
    permanentAddress
  ]
  const commodityObligations = [
    commodityCode,
    commodityType,
    species,
    numberOfAnimals,
    numberOfPackages,
    ...identifierObligations
  ]
  const recordsByObligation = new Map(
    commodityObligations.map((obligation) => [
      obligation,
      reader.records(obligation)
    ])
  )
  const valueAt = (obligation, fulfilmentIndex) =>
    recordsByObligation.get(obligation)[fulfilmentIndex]
  const identifiers = {
    microchip,
    passport,
    tattoo,
    earTag,
    horseName,
    identificationDetails,
    description,
    permanentAddress
  }
  return reader
    .groupFulfilmentIndexes(commodityLine, commodityObligations)
    .map((lineIndex) => {
      const unitIndexes = reader.groupFulfilmentIndexes(
        unitRecord,
        identifierObligations,
        lineIndex
      )
      return compact({
        commoditySelection: valueAt(commodityCode, lineIndex),
        commodityType: valueAt(commodityType, lineIndex),
        speciesSelection: valueAt(species, lineIndex),
        numberOfAnimalsQuantity: legacyAnimalCount(
          valueAt(numberOfAnimals, lineIndex)
        ),
        numberOfPackages: valueAt(numberOfPackages, lineIndex),
        animalIdentifiers:
          unitIndexes.length > 0
            ? unitIndexes.map((u) => unitFrom(valueAt, identifiers, u))
            : undefined
      })
    })
}
