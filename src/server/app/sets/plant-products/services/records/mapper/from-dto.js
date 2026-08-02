const defined = (source, fields) =>
  Object.fromEntries(
    fields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]])
  )

const mapOrigin = (dto) => ({
  ...(dto.origin?.countryCode
    ? { countryOfOrigin: dto.origin.countryCode }
    : {}),
  ...(dto.origin?.countryOfConsignmentCode
    ? { countryOfConsignment: dto.origin.countryOfConsignmentCode }
    : {}),
  ...(dto.origin?.internalReference
    ? { internalReference: dto.origin.internalReference }
    : {})
})

const mapPurpose = (dto) => ({
  ...(dto.reasonForImport ? { reasonForImport: dto.reasonForImport } : {})
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

const mapCommodityLine = (entry) => ({
  ...defined(entry, LINE_FIELDS),
  ...(entry.commodityCode !== undefined
    ? { commoditySelection: entry.commodityCode }
    : {}),
  species: Array.isArray(entry.species) ? entry.species.map(mapSpecies) : []
})

const mapCommodity = (dto) =>
  Array.isArray(dto.commodity?.commodityComplement)
    ? {
        commodityLines: dto.commodity.commodityComplement.map(mapCommodityLine)
      }
    : {}

const SECTION_MAPPERS = Object.freeze([mapOrigin, mapPurpose, mapCommodity])

const composeSections = (dto) =>
  SECTION_MAPPERS.reduce(
    (answers, mapSection) => ({ ...answers, ...mapSection(dto) }),
    {}
  )

export const fromDto = (dto = {}) => composeSections(dto ?? {})
