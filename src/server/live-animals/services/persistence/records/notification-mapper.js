// Native mappers from canonical UUID-keyed fulfilment to backend notifications.
//
// Mapper A (fulfilmentToNotification) reproduces exactly what the production
// skeleton frontend persists — the same backend field homes and transforms as
// src/server/common/clients/notification-client.js (buildNotificationPayload).
//
// Mapper B (answersToTargetNotification) is Mapper A plus the durable extra
// fields, including the per-species commodity lines. Despite its legacy name,
// it reads the same canonical fulfilment snapshot as Mapper A and layers its
// extras over Mapper A's base.

import {
  speciesLabel,
  commodityCodeFor,
  typeTextForId
} from '../../commodities/index.js'
import { readFulfilment } from '../../../bridge/read-fulfilment.js'
import {
  accompanyingDocumentAttachmentType,
  accompanyingDocumentDateOfIssue,
  accompanyingDocumentReference,
  accompanyingDocumentType,
  animalsCertifiedFor,
  arrivalDateAtPort,
  commercialTransporter,
  commodityCode,
  commodityLine,
  commodityType,
  consignee,
  consignor,
  contactAddress,
  containsUnweanedAnimals,
  countryOfOrigin,
  cph,
  description,
  documentFilename,
  documentUploadId,
  documents,
  earTag,
  horseName,
  identificationDetails,
  importer,
  internalReferenceNumber,
  meansOfTransport,
  numberOfAnimals,
  numberOfPackages,
  passport,
  permanentAddress,
  placeOfDestination,
  placeOfOrigin,
  portOfEntry,
  privateTransporter,
  purposeInInternalMarket,
  reasonForImport,
  regionCode,
  regionCodeRequirement,
  responsiblePersonForLoad,
  species,
  tattoo,
  transitedCountries,
  transportDocumentReference,
  transportIdentification,
  transporterType,
  unitRecord
} from '../../../model/obligations/obligations.js'

const compact = (source) =>
  Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined)
  )

const orUndefined = (obj) => (Object.keys(obj).length ? obj : undefined)

const isoFromDateParts = (parts) => {
  const { day, month, year } = parts ?? {}
  if (day == null || month == null || year == null) return undefined
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Shared builders (used by both mappers)
// ---------------------------------------------------------------------------

// The store is line-per-species: a commodity line is one commodity
// code plus ONE species with its own counts and nested identifier records.
// The skeleton commodity blob is one complement per COMMODITY with a species
// array, per-species counts and complement-level totals — so both mappers
// group lines by commodity and consolidate counts UP to the complement total.
const groupLinesByCommodity = (lines) =>
  Object.values(Object.groupBy(lines, (line) => line.commoditySelection))

// Skeleton parity: getTotal (lodash) maps Number, drops NaN and sums — a blank
// count contributes 0. Omitted entirely when no line carries the field.
const totalOf = (lines, field) => {
  const values = lines
    .map((line) => line[field])
    .filter((value) => value !== undefined)
  if (values.length === 0) return undefined
  return values
    .map(Number)
    .filter((number) => !Number.isNaN(number))
    .reduce((sum, number) => sum + number, 0)
}

// Species value → display name via the prototype's commodity reference data,
// falling back to the raw value for unknown codes — matching the skeleton's
// `speciesByValue.get(value) ?? value` resolution. One entry per line; the
// skeleton pairs one earTag/passport per species row, so the entry carries the
// line's first identifier unit.
const speciesEntryFromLine = (line) => {
  const unit = line.animalIdentifiers?.[0] ?? {}
  return compact({
    value: line.speciesSelection,
    text: speciesLabel(line.speciesSelection) ?? line.speciesSelection,
    noOfAnimals: line.numberOfAnimalsQuantity,
    noOfPackages: line.numberOfPackages,
    earTag: unit.animalIdentifierEarTag,
    passport: unit.animalIdentifierPassport
  })
}

const speciesLines = (group) =>
  group.filter((line) => line.speciesSelection !== undefined)

// ---------------------------------------------------------------------------
// Mapper A — skeleton-exact backend notification
// ---------------------------------------------------------------------------

// One complement per commodity group. The complement totals are numbers (the
// skeleton computes them via a lodash sum over the per-species counts), while
// the per-species noOfAnimals/noOfPackages stay the raw string answers.
// typeOfCommodity is the payload text of the line's stored commodityType id,
// omitted when that type's text is blank (the single-type commodities).
const typeTextForLine = (line) => {
  const text = typeTextForId(line.commoditySelection, line.commodityType)
  return text === '' ? undefined : text
}

const baseComplementFromGroup = (group) => {
  const species = speciesLines(group).map(speciesEntryFromLine)
  return compact({
    typeOfCommodity: typeTextForLine(group[0]),
    totalNoOfAnimals: totalOf(group, 'numberOfAnimalsQuantity'),
    totalNoOfPackages: totalOf(group, 'numberOfPackages'),
    species: species.length > 0 ? species : undefined
  })
}

const commodityFromLinesA = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) return undefined
  return {
    name: lines[0].commoditySelection,
    commodityComplement: groupLinesByCommodity(lines).map(
      baseComplementFromGroup
    )
  }
}

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

const legacyAnimalCount = (value) =>
  typeof value === 'number' ? String(value) : value

// One logical line/unit join over the independent canonical record maps. Line
// and unit identity comes only from exact composite ids; a leaf is joined only
// when its record map contains that exact id.
const commodityLinesFromFulfilment = (reader) => {
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

const directFieldsFromFulfilment = (reader, referenceNumber) =>
  compact({
    referenceNumber,
    reasonForImport: reader.scalar(reasonForImport),
    placeOfOrigin: reader.scalar(placeOfOrigin),
    consignor: reader.scalar(consignor),
    consignee: reader.scalar(consignee),
    importer: reader.scalar(importer),
    destination: reader.scalar(placeOfDestination),
    consignment: reader.scalar(contactAddress),
    cphNumber: reader.scalar(cph)
  })

const originFromFulfilment = (reader) =>
  orUndefined(
    compact({
      countryCode: reader.scalar(countryOfOrigin),
      requiresRegionCode: reader.scalar(regionCodeRequirement),
      internalReference: reader.scalar(internalReferenceNumber)
    })
  )

const additionalDetailsFromFulfilment = (reader) =>
  orUndefined(
    compact({
      certifiedFor: reader.scalar(animalsCertifiedFor),
      unweanedAnimals: reader.scalar(containsUnweanedAnimals)
    })
  )

const transporterFromFulfilment = (reader) => {
  const source =
    reader.scalar(commercialTransporter) ?? reader.scalar(privateTransporter)
  return orUndefined(
    compact({
      name: source?.name,
      address: source?.address,
      approvalNumber: source?.approvalNumber,
      type: reader.scalar(transporterType)
    })
  )
}

const transportFromFulfilment = (reader) =>
  orUndefined(
    compact({
      portOfEntry: reader.scalar(portOfEntry),
      arrivalDate: isoFromDateParts(reader.scalar(arrivalDateAtPort)),
      transporter: transporterFromFulfilment(reader)
    })
  )

const notificationFromFulfilment = (reader, referenceNumber, lines) => {
  const notification = {
    ...directFieldsFromFulfilment(reader, referenceNumber)
  }

  const origin = originFromFulfilment(reader)
  if (origin) notification.origin = origin

  const additionalDetails = additionalDetailsFromFulfilment(reader)
  if (additionalDetails) notification.additionalDetails = additionalDetails

  const transport = transportFromFulfilment(reader)
  if (transport) notification.transport = transport

  const commodity = commodityFromLinesA(lines)
  if (commodity) notification.commodity = commodity

  return notification
}

// Mapper A's production entry point: canonical UUID map + envelope id.
export const fulfilmentToNotification = (fulfilment = {}, referenceNumber) => {
  const reader = readFulfilment(fulfilment)
  const lines = commodityLinesFromFulfilment(reader)
  return notificationFromFulfilment(reader, referenceNumber, lines)
}

// ---------------------------------------------------------------------------
// Mapper B — Mapper A plus the full set of durable projection fields
// ---------------------------------------------------------------------------

const targetUnit = (unit) =>
  compact({
    passport: unit.animalIdentifierPassport,
    tattoo: unit.animalIdentifierTattoo,
    earTag: unit.animalIdentifierEarTag,
    horseName: unit.horseName,
    identificationDetails: unit.animalIdentifierIdentificationDetails,
    description: unit.animalIdentifierDescription,
    permanentAddress: unit.permanentAddress
  })

// Mapper A's grouped commodity, with each complement enriched by the extra
// commodityCode + per-group name (so every group keeps its commodity
// identity, not just the first) and each species entry carrying the line's
// FULL identifier records — the lossless per-species shape.
const targetComplementFromGroup = (group) => {
  const base = baseComplementFromGroup(group)
  const name = group[0].commoditySelection
  const withSpecies = speciesLines(group)
  return compact({
    commodityCode:
      name === undefined ? undefined : (commodityCodeFor(name) ?? name),
    name,
    ...base,
    species: base.species?.map((entry, index) =>
      compact({
        ...entry,
        animalIdentifiers: withSpecies[index].animalIdentifiers?.map(targetUnit)
      })
    )
  })
}

const targetCommodityFromLines = (lines) => {
  const base = commodityFromLinesA(lines)
  if (!base) return undefined
  return {
    ...base,
    commodityComplement: groupLinesByCommodity(lines).map(
      targetComplementFromGroup
    )
  }
}

const documentObligations = [
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue
]
const documentInstanceObligations = [
  ...documentObligations,
  documentUploadId,
  documentFilename
]

const targetDocumentsFromFulfilment = (reader) => {
  const recordsByObligation = new Map(
    documentObligations.map((obligation) => [
      obligation,
      reader.records(obligation)
    ])
  )
  const valueAt = (obligation, id) => recordsByObligation.get(obligation)[id]
  // Upload metadata establishes the canonical document record but is not
  // projected into Mapper B's proposed-notification document shape.
  const ids = reader.instanceIds(documents, documentInstanceObligations)
  if (ids.length === 0) return undefined
  return ids.map((id) =>
    compact({
      documentType: valueAt(accompanyingDocumentType, id),
      attachmentType: valueAt(accompanyingDocumentAttachmentType, id),
      reference: valueAt(accompanyingDocumentReference, id),
      dateOfIssue: valueAt(accompanyingDocumentDateOfIssue, id)
    })
  )
}

// Mapper B's production entry point: canonical UUID map + envelope id. The
// line/unit projection is constructed once and shared by Mapper A's base and
// Mapper B's enriched commodity projection.
export const answersToTargetNotification = (
  fulfilment = {},
  referenceNumber
) => {
  const reader = readFulfilment(fulfilment)
  const lines = commodityLinesFromFulfilment(reader)
  const notification = notificationFromFulfilment(
    reader,
    referenceNumber,
    lines
  )

  const responsiblePerson = reader.scalar(responsiblePersonForLoad)
  if (responsiblePerson !== undefined) {
    notification.responsiblePersonForLoad = responsiblePerson
  }

  const purpose = reader.scalar(purposeInInternalMarket)
  if (purpose !== undefined) notification.purpose = purpose

  const region = reader.scalar(regionCode)
  if (region !== undefined) {
    notification.origin = { ...notification.origin, regionCode: region }
  }

  const transportExtras = compact({
    meansOfTransport: reader.scalar(meansOfTransport),
    transportIdentification: reader.scalar(transportIdentification),
    transportDocumentReference: reader.scalar(transportDocumentReference),
    transitedCountries: reader.scalar(transitedCountries)
  })
  if (Object.keys(transportExtras).length > 0) {
    notification.transport = {
      ...notification.transport,
      ...transportExtras
    }
  }

  const commodity = targetCommodityFromLines(lines)
  if (commodity) notification.commodity = commodity

  const targetDocumentEntries = targetDocumentsFromFulfilment(reader)
  if (targetDocumentEntries) notification.documents = targetDocumentEntries

  return notification
}
