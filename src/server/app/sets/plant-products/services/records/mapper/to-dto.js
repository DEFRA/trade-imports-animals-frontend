import { descriptionFor } from '../../commodities/index.js'
import { placeholderOrganisationOperator } from '../../placeholder-org.js'
import { canonicalMeasurementNumber } from '../measurement-number.js'

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

const mapCommodity = (answers) => {
  const commodity = {
    ...(answers.commodityInputMethod !== undefined
      ? { inputMethod: answers.commodityInputMethod }
      : {}),
    ...(Array.isArray(answers.commodityLines)
      ? {
          commodityComplement: answers.commodityLines.map(mapCommodityLine)
        }
      : {})
  }
  return Object.keys(commodity).length > 0 ? { commodity } : {}
}

const ADDITIONAL_DETAILS_FIELDS = [
  'totalGrossWeight',
  'grossVolume',
  'grossVolumeUnit'
]

const mapAdditionalDetails = (answers) => {
  const additionalDetails = Object.fromEntries(
    Object.entries(defined(answers, ADDITIONAL_DETAILS_FIELDS)).map(
      ([field, value]) => [
        field,
        field === 'grossVolumeUnit' ? value : canonicalMeasurementNumber(value)
      ]
    )
  )
  return Object.keys(additionalDetails).length > 0 ? { additionalDetails } : {}
}

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

const mapTransport = (answers) => {
  const transport = {
    ...defined(answers, TRANSPORT_FIELDS),
    ...(Array.isArray(answers.containers)
      ? { containers: answers.containers.map(mapContainer) }
      : {})
  }
  return Object.keys(transport).length > 0 ? { transport } : {}
}

const mapGoodsMovementServices = (answers) => {
  const goodsMovementServices = {
    ...defined(answers, ['commonTransitConvention']),
    ...(answers.commonTransitConvention === 'ADD_MRN_NOW' &&
    answers.movementReferenceNumber !== undefined
      ? { movementReferenceNumber: answers.movementReferenceNumber }
      : {}),
    ...defined(answers, ['usingGvms'])
  }
  return Object.keys(goodsMovementServices).length > 0
    ? { goodsMovementServices }
    : {}
}

const mapResponsiblePerson = (answers) => {
  const responsiblePerson = {
    ...(answers.responsiblePersonName !== undefined
      ? { name: answers.responsiblePersonName }
      : {}),
    ...(answers.responsiblePersonEmail !== undefined
      ? { email: answers.responsiblePersonEmail }
      : {}),
    ...(answers.responsiblePersonTelephone !== undefined
      ? { telephone: answers.responsiblePersonTelephone }
      : {})
  }
  return Object.keys(responsiblePerson).length > 0 ? { responsiblePerson } : {}
}

const mapNominatedContact = (entry) => ({
  ...(entry.contactName !== undefined ? { name: entry.contactName } : {}),
  ...(entry.contactEmail !== undefined ? { email: entry.contactEmail } : {}),
  ...(entry.contactTelephone !== undefined
    ? { telephone: entry.contactTelephone }
    : {}),
  ...(entry.contactIsAgent !== undefined
    ? { isAgent: entry.contactIsAgent }
    : {})
})

const mapNominatedContacts = (answers) =>
  Array.isArray(answers.nominatedContacts) &&
  answers.nominatedContacts.length > 0
    ? {
        nominatedContacts: answers.nominatedContacts.map(mapNominatedContact)
      }
    : {}

const operatorFromAnswers = (answers, prefix) => {
  const name = answers[`${prefix}Name`]
  const telephone = answers[`${prefix}Telephone`]
  const email = answers[`${prefix}Email`]
  const address = {
    ...defined(answers, [
      `${prefix}AddressLine1`,
      `${prefix}AddressLine2`,
      `${prefix}AddressLine3`,
      `${prefix}City`,
      `${prefix}Postcode`,
      `${prefix}Country`
    ])
  }
  const mappedAddress = Object.fromEntries(
    Object.entries(address).map(([field, value]) => [
      field
        .slice(prefix.length)
        .replace(/^./, (letter) => letter.toLowerCase()),
      value
    ])
  )
  return {
    ...(name !== undefined ? { name } : {}),
    ...(telephone !== undefined ? { telephone } : {}),
    ...(email !== undefined ? { email } : {}),
    ...(Object.keys(mappedAddress).length > 0 ? { address: mappedAddress } : {})
  }
}

const hasAnsweredPartyField = (operator) =>
  Boolean(
    operator.name ||
    operator.telephone ||
    operator.email ||
    Object.values(operator.address ?? {}).some((value) => Boolean(value))
  )

const mapParties = (answers) => {
  const importer = placeholderOrganisationOperator()
  const enteredDestination = operatorFromAnswers(answers, 'destination')
  const packer = operatorFromAnswers(answers, 'packer')
  const consignor = operatorFromAnswers(answers, 'consignor')
  return {
    importer,
    ...(answers.destinationSameAsConsignee === true
      ? { destination: structuredClone(importer) }
      : answers.destinationSameAsConsignee === false
        ? { destination: enteredDestination }
        : {}),
    ...(hasAnsweredPartyField(packer) ? { packer } : {}),
    ...(hasAnsweredPartyField(consignor) ? { consignor } : {})
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
  mapNominatedContacts,
  mapParties
])

const composeSections = (answers) =>
  SECTION_MAPPERS.reduce(
    (dto, mapSection) => ({ ...dto, ...mapSection(answers) }),
    {}
  )

export const toDto = (answers = {}) => composeSections(answers ?? {})

const padded = (value) => String(value ?? '').padStart(2, '0')

export const documentToDto = (entry = {}) => ({
  documentType: entry.documentType,
  documentReference: entry.documentReference,
  issueDate: `${entry.issueDate?.year}-${padded(entry.issueDate?.month)}-${padded(entry.issueDate?.day)}`
})
