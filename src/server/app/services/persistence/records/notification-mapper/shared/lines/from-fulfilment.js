import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact } from '../compact.js'

const legacyAnimalCount = (value) =>
  typeof value === 'number' ? String(value) : value

// One logical line/unit join over the independent canonical record maps. Line
// and unit identity comes only from exact composite ids; a leaf is joined only
// when its record map contains that exact id.
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
  const valueAt = (obligation, id) => recordsByObligation.get(obligation)[id]
  const unitFrom = (unitId) =>
    compact({
      animalIdentifierPassport: valueAt(passport, unitId),
      animalIdentifierTattoo: valueAt(tattoo, unitId),
      animalIdentifierEarTag: valueAt(earTag, unitId),
      horseName: valueAt(horseName, unitId),
      animalIdentifierIdentificationDetails: valueAt(
        identificationDetails,
        unitId
      ),
      animalIdentifierDescription: valueAt(description, unitId),
      permanentAddress: valueAt(permanentAddress, unitId)
    })

  return reader
    .instanceIds(commodityLine, commodityObligations)
    .map((lineId) => {
      const unitIds = reader.instanceIds(
        unitRecord,
        identifierObligations,
        lineId
      )
      return compact({
        commoditySelection: valueAt(commodityCode, lineId),
        commodityType: valueAt(commodityType, lineId),
        speciesSelection: valueAt(species, lineId),
        numberOfAnimalsQuantity: legacyAnimalCount(
          valueAt(numberOfAnimals, lineId)
        ),
        numberOfPackages: valueAt(numberOfPackages, lineId),
        animalIdentifiers:
          unitIds.length > 0 ? unitIds.map(unitFrom) : undefined
      })
    })
}
