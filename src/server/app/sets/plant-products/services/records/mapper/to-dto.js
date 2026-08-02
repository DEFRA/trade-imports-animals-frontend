import { descriptionFor } from '../../commodities/index.js'

const defined = (source, fields) =>
  Object.fromEntries(
    fields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]])
  )

const mapOrigin = (answers) => {
  const origin = {
    ...(answers.countryOfOrigin
      ? { countryCode: answers.countryOfOrigin }
      : {}),
    ...(answers.countryOfConsignment
      ? { countryOfConsignmentCode: answers.countryOfConsignment }
      : {}),
    ...(answers.internalReference
      ? { internalReference: answers.internalReference }
      : {})
  }
  return Object.keys(origin).length > 0 ? { origin } : {}
}

const mapPurpose = (answers) => ({
  ...(answers.reasonForImport
    ? { reasonForImport: answers.reasonForImport }
    : {})
})

const mapVariety = (entry) => defined(entry, ['variety', 'varietyClass'])

const mapSpecies = (entry) => ({
  ...defined(entry, ['eppoCode', 'genusAndSpecies', 'speciesId']),
  varieties: Array.isArray(entry.varieties)
    ? entry.varieties.map(mapVariety)
    : []
})

const LINE_FIELDS = [
  'uniqueComplementId',
  'numberOfPackages',
  'packageType',
  'quantity',
  'quantityType',
  'netWeight',
  'controlledAtmosphereContainer',
  'finishedOrPropagated',
  'intendedForFinalUsers',
  'testAndTrial'
]

const mapCommodityLine = (entry) => {
  const commodityDescription = descriptionFor(entry.commoditySelection)

  return {
    ...defined(entry, LINE_FIELDS),
    ...(entry.commoditySelection !== undefined
      ? { commodityCode: entry.commoditySelection }
      : {}),
    ...(commodityDescription !== undefined ? { commodityDescription } : {}),
    species: Array.isArray(entry.species) ? entry.species.map(mapSpecies) : []
  }
}

const mapCommodity = (answers) =>
  Array.isArray(answers.commodityLines)
    ? {
        commodity: {
          commodityComplement: answers.commodityLines.map(mapCommodityLine)
        }
      }
    : {}

const SECTION_MAPPERS = Object.freeze([mapOrigin, mapPurpose, mapCommodity])

const composeSections = (answers) =>
  SECTION_MAPPERS.reduce(
    (dto, mapSection) => ({ ...dto, ...mapSection(answers) }),
    {}
  )

export const toDto = (answers = {}) => composeSections(answers ?? {})
