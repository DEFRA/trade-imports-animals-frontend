import { format, isValid, parseISO } from 'date-fns'
import { getDocumentTypeLabel } from '../../accompanying-documents/document-upload-config.js'

const NOT_PROVIDED = 'Not provided'
const DETAIL_DATE_FORMAT = 'd MMMM yyyy'

const REASON_FOR_IMPORT_LABELS = {
  internalMarket: 'Internal market',
  reEntry: 'Re-entry'
}

const CERTIFIED_FOR_LABELS = {
  approvedBodies: 'Approved bodies',
  breedingAndOrProduction: 'Breeding and/or production',
  slaughter: 'Slaughter'
}

const YES_NO_LABELS = {
  yes: 'Yes',
  no: 'No'
}

function formatDetailDate(value) {
  if (!value) {
    return NOT_PROVIDED
  }
  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? format(date, DETAIL_DATE_FORMAT) : NOT_PROVIDED
}

function formatAddress(entity) {
  if (!entity) {
    return NOT_PROVIDED
  }
  const { address } = entity
  if (!address) {
    return entity.name ?? NOT_PROVIDED
  }

  const lines = [
    entity.name,
    address.addressLine1,
    address.addressLine2,
    address.addressLine3,
    address.city,
    address.postcode,
    address.country
  ].filter(Boolean)

  return lines.length ? lines.join('\n') : NOT_PROVIDED
}

function mapOrigin(origin, countryMap = {}) {
  if (!origin) {
    return {
      countryOfOrigin: NOT_PROVIDED,
      regionOfConsignment: NOT_PROVIDED,
      internalReference: NOT_PROVIDED
    }
  }
  return {
    countryOfOrigin:
      countryMap[origin.countryCode] ?? origin.countryCode ?? NOT_PROVIDED,
    regionOfConsignment: origin.requiresRegionCode
      ? (YES_NO_LABELS[origin.requiresRegionCode] ?? origin.requiresRegionCode)
      : NOT_PROVIDED,
    internalReference: origin.internalReference ?? NOT_PROVIDED
  }
}

function mapSpeciesEntry(s) {
  return {
    name: s.text ?? s.value ?? NOT_PROVIDED,
    earTag: s.earTag ?? NOT_PROVIDED,
    passport: s.passport ?? NOT_PROVIDED
  }
}

function mapComplementToSpecies(complement) {
  if (!Array.isArray(complement.species)) {
    return []
  }
  return complement.species.map(mapSpeciesEntry)
}

function mapCommodity(commodity) {
  if (!commodity) {
    return { name: NOT_PROVIDED, species: [] }
  }
  const name = commodity.name ?? NOT_PROVIDED
  const code = commodity.code ?? null
  const displayName = code ? `${name} (${code})` : name

  const species = Array.isArray(commodity.commodityComplement)
    ? commodity.commodityComplement.flatMap(mapComplementToSpecies)
    : []

  return { name: displayName, species }
}

function mapAdditionalDetails(additionalDetails) {
  if (!additionalDetails) {
    return { certifiedFor: NOT_PROVIDED, unweanedAnimals: NOT_PROVIDED }
  }
  return {
    certifiedFor: additionalDetails.certifiedFor
      ? (CERTIFIED_FOR_LABELS[additionalDetails.certifiedFor] ??
        additionalDetails.certifiedFor)
      : NOT_PROVIDED,
    unweanedAnimals: additionalDetails.unweanedAnimals
      ? (YES_NO_LABELS[additionalDetails.unweanedAnimals] ??
        additionalDetails.unweanedAnimals)
      : NOT_PROVIDED
  }
}

function mapReasonForImport(reasonForImport) {
  if (!reasonForImport) {
    return NOT_PROVIDED
  }
  return REASON_FOR_IMPORT_LABELS[reasonForImport] ?? reasonForImport
}

function mapAddresses(notification) {
  return {
    placeOfOrigin: formatAddress(notification.placeOfOrigin),
    consignor: formatAddress(notification.consignor),
    consignee: formatAddress(notification.consignee),
    importer: formatAddress(notification.importer),
    placeOfDestination: formatAddress(notification.destination),
    consignment: formatAddress(notification.consignment)
  }
}

function mapTransport(transport) {
  if (!transport) {
    return {
      transporterName: NOT_PROVIDED,
      transporterAddress: NOT_PROVIDED,
      type: NOT_PROVIDED,
      approvalNumber: NOT_PROVIDED,
      portOfEntry: NOT_PROVIDED,
      arrivalDate: NOT_PROVIDED
    }
  }
  const { transporter } = transport
  return {
    transporterName: transporter?.name ?? NOT_PROVIDED,
    transporterAddress: formatAddress(transporter),
    type: transporter?.type ?? NOT_PROVIDED,
    approvalNumber: transporter?.approvalNumber ?? NOT_PROVIDED,
    portOfEntry: transport.portOfEntry ?? NOT_PROVIDED,
    arrivalDate: formatDetailDate(transport.arrivalDate)
  }
}

function mapDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return []
  }
  return documents.map((doc) => ({
    type: doc.type ? getDocumentTypeLabel(doc.type) : NOT_PROVIDED,
    reference: doc.reference ?? NOT_PROVIDED,
    validUntil: doc.validUntil
      ? formatDetailDate(doc.validUntil)
      : NOT_PROVIDED,
    attachments: doc.attachments ?? NOT_PROVIDED
  }))
}

/**
 * Maps a backend notification object to a view model for the notification details page.
 */
export function mapNotificationToView(notification, countryMap = {}) {
  return {
    referenceNumber: notification.referenceNumber ?? NOT_PROVIDED,
    dateCreated: formatDetailDate(
      notification.createdAt ?? notification.dateCreated ?? notification.created
    ),
    origin: mapOrigin(notification.origin, countryMap),
    commodity: mapCommodity(notification.commodity),
    additionalDetails: mapAdditionalDetails(notification.additionalDetails),
    reasonForImport: mapReasonForImport(notification.reasonForImport),
    addresses: mapAddresses(notification),
    cphNumber: notification.cphNumber ?? NOT_PROVIDED,
    transport: mapTransport(notification.transport),
    documents: mapDocuments(notification.documents),
    status: notification.status ?? null
  }
}
