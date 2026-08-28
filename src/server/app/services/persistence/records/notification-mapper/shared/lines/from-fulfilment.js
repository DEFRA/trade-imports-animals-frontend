import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact } from '../compact.js'

const legacyAnimalCount = (value) =>
  typeof value === 'number' ? String(value) : value

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
    numberOfAnimals,
    numberOfPackages,
    passport,
    permanentAddress,
    species,
    tattoo,
    unitRecord
  } = obligationSet()
  const identifierObligations = [
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
  const unitFrom = (unitIndex) =>
    compact({
      animalIdentifierPassport: valueAt(passport, unitIndex),
      animalIdentifierTattoo: valueAt(tattoo, unitIndex),
      animalIdentifierEarTag: valueAt(earTag, unitIndex),
      horseName: valueAt(horseName, unitIndex),
      animalIdentifierIdentificationDetails: valueAt(
        identificationDetails,
        unitIndex
      ),
      animalIdentifierDescription: valueAt(description, unitIndex),
      permanentAddress: valueAt(permanentAddress, unitIndex)
    })

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
          unitIndexes.length > 0 ? unitIndexes.map(unitFrom) : undefined
      })
    })
}
