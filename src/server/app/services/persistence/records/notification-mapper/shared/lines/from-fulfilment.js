import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact } from '../compact.js'

const IDENTIFIER_KEYS = [
  'microchip',
  'passport',
  'tattoo',
  'earTag',
  'horseName',
  'identificationDetails',
  'description',
  'permanentAddress'
]

const legacyAnimalCount = (value) =>
  typeof value === 'number' ? String(value) : value

const identifiersFrom = (obligations) =>
  Object.fromEntries(IDENTIFIER_KEYS.map((key) => [key, obligations[key]]))

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

const lineFrom = ({
  obligations,
  identifiers,
  valueAt,
  unitIndexes,
  lineIndex
}) =>
  compact({
    commoditySelection: valueAt(obligations.commodityCode, lineIndex),
    commodityType: valueAt(obligations.commodityType, lineIndex),
    speciesSelection: valueAt(obligations.species, lineIndex),
    numberOfAnimalsQuantity: legacyAnimalCount(
      valueAt(obligations.numberOfAnimals, lineIndex)
    ),
    numberOfPackages: valueAt(obligations.numberOfPackages, lineIndex),
    animalIdentifiers:
      unitIndexes.length > 0
        ? unitIndexes.map((u) => unitFrom(valueAt, identifiers, u))
        : undefined
  })

// One logical line/unit join over the independent canonical record maps.
// Line and unit identity comes only from exact fulfilment indexes; a leaf
// is joined only when its record map contains that exact fulfilment index.
export const commodityLinesFromFulfilment = (reader) => {
  const obligations = obligationSet()
  const identifiers = identifiersFrom(obligations)
  const identifierObligations = Object.values(identifiers)
  const commodityObligations = [
    obligations.commodityCode,
    obligations.commodityType,
    obligations.species,
    obligations.numberOfAnimals,
    obligations.numberOfPackages,
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
  return reader
    .groupFulfilmentIndexes(obligations.commodityLine, commodityObligations)
    .map((lineIndex) =>
      lineFrom({
        obligations,
        identifiers,
        valueAt,
        unitIndexes: reader.groupFulfilmentIndexes(
          obligations.unitRecord,
          identifierObligations,
          lineIndex
        ),
        lineIndex
      })
    )
}
