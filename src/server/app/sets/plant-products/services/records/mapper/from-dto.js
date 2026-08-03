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

const mapCommodity = (dto) => ({
  ...(dto.commodity?.inputMethod !== undefined
    ? { commodityInputMethod: dto.commodity.inputMethod }
    : {}),
  ...(Array.isArray(dto.commodity?.commodityComplement)
    ? {
        commodityLines: dto.commodity.commodityComplement.map(mapCommodityLine)
      }
    : {})
})

const ADDITIONAL_DETAILS_FIELDS = [
  'totalGrossWeight',
  'grossVolume',
  'grossVolumeUnit'
]

const mapAdditionalDetails = (dto) =>
  dto.additionalDetails && typeof dto.additionalDetails === 'object'
    ? defined(dto.additionalDetails, ADDITIONAL_DETAILS_FIELDS)
    : {}

const TRANSPORT_FIELDS = [
  'borderControlPost',
  'inspectionPremises',
  'meansOfTransport',
  'transportIdentification',
  'transportDocumentReference',
  'arrivalDate',
  'arrivalTime',
  'usesContainers'
]

const mapContainer = (entry) =>
  defined(entry, ['containerNumber', 'sealNumber', 'officialSeal'])

const mapTransport = (dto) => {
  if (!dto.transport || typeof dto.transport !== 'object') return {}
  return {
    ...defined(dto.transport, TRANSPORT_FIELDS),
    ...(Array.isArray(dto.transport.containers)
      ? { containers: dto.transport.containers.map(mapContainer) }
      : {})
  }
}

const dateFromIso = (value) => {
  const [year = '', month = '', day = ''] = String(value ?? '').split('-')
  return {
    day: day ? String(Number(day)) : '',
    month: month ? String(Number(month)) : '',
    year
  }
}

const mapDocument = (entry) => ({
  documentType: entry.documentType,
  documentReference: entry.documentReference,
  issueDate: dateFromIso(entry.issueDate)
})

const mapDocuments = (dto) =>
  Array.isArray(dto.accompanyingDocuments) &&
  dto.accompanyingDocuments.length > 0
    ? {
        accompanyingDocuments: dto.accompanyingDocuments.map(mapDocument)
      }
    : {}

const SECTION_MAPPERS = Object.freeze([
  mapOrigin,
  mapPurpose,
  mapCommodity,
  mapAdditionalDetails,
  mapTransport,
  mapDocuments
])

const composeSections = (dto) =>
  SECTION_MAPPERS.reduce(
    (answers, mapSection) => ({ ...answers, ...mapSection(dto) }),
    {}
  )

export const fromDto = (dto = {}) => composeSections(dto ?? {})
