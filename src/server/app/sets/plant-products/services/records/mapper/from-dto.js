import { isDeepStrictEqual } from 'node:util'

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

const mapGoodsMovementServices = (dto) => {
  const source = dto.goodsMovementServices
  if (!source || typeof source !== 'object') return {}
  return {
    ...defined(source, ['commonTransitConvention']),
    ...(source.commonTransitConvention === 'ADD_MRN_NOW' &&
    source.movementReferenceNumber !== undefined
      ? { movementReferenceNumber: source.movementReferenceNumber }
      : {}),
    ...defined(source, ['usingGvms'])
  }
}

const mapResponsiblePerson = (dto) => {
  const source = dto.responsiblePerson
  if (!source || typeof source !== 'object') return {}
  return {
    ...(source.name != null ? { responsiblePersonName: source.name } : {}),
    ...(source.email != null ? { responsiblePersonEmail: source.email } : {}),
    ...(source.telephone != null
      ? { responsiblePersonTelephone: source.telephone }
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

const mapOperator = (operator, prefix) => {
  if (!operator || typeof operator !== 'object') return {}
  const address = operator.address
  return {
    ...(operator.name != null ? { [`${prefix}Name`]: operator.name } : {}),
    ...(operator.telephone != null
      ? { [`${prefix}Telephone`]: operator.telephone }
      : {}),
    ...(operator.email != null ? { [`${prefix}Email`]: operator.email } : {}),
    ...(address && typeof address === 'object'
      ? {
          ...(address.addressLine1 != null
            ? { [`${prefix}AddressLine1`]: address.addressLine1 }
            : {}),
          ...(address.addressLine2 != null
            ? { [`${prefix}AddressLine2`]: address.addressLine2 }
            : {}),
          ...(address.addressLine3 != null
            ? { [`${prefix}AddressLine3`]: address.addressLine3 }
            : {}),
          ...(address.city != null ? { [`${prefix}City`]: address.city } : {}),
          ...(address.postcode != null
            ? { [`${prefix}Postcode`]: address.postcode }
            : {}),
          ...(address.country != null
            ? { [`${prefix}Country`]: address.country }
            : {})
        }
      : {})
  }
}

const mapParties = (dto) => {
  const destination = dto.destination
  return {
    ...(destination && typeof destination === 'object'
      ? isDeepStrictEqual(destination, dto.importer)
        ? { destinationSameAsConsignee: true }
        : {
            destinationSameAsConsignee: false,
            ...mapOperator(destination, 'destination')
          }
      : {}),
    ...mapOperator(dto.packer, 'packer'),
    ...mapOperator(dto.consignor, 'consignor')
  }
}

const SECTION_MAPPERS = Object.freeze([
  mapOrigin,
  mapPurpose,
  mapCommodity,
  mapAdditionalDetails,
  mapTransport,
  mapGoodsMovementServices,
  mapResponsiblePerson,
  mapDocuments,
  mapParties
])

const composeSections = (dto) =>
  SECTION_MAPPERS.reduce(
    (answers, mapSection) => ({ ...answers, ...mapSection(dto) }),
    {}
  )

export const fromDto = (dto = {}) => composeSections(dto ?? {})
