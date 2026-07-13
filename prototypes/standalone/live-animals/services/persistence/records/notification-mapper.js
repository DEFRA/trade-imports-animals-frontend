// Native bidirectional mappers between the engine's obligation-id-keyed
// `answers` and a backend `notification`.
//
// Mapper A (answersToNotification / notificationToAnswers) reproduces exactly
// what the production skeleton frontend persists — the same backend field homes
// and transforms as src/server/common/clients/notification-client.js
// (buildNotificationPayload / setNotificationSessionValues). It is total on the
// storable obligations and carries nothing the skeleton does not persist.
//
// Mapper B (answersToTargetNotification / targetNotificationToAnswers) is Mapper
// A plus the extra fields — a lossless round-trip demonstrator over all 46
// obligations. It reuses Mapper A's builders and layers the extras on top; it is
// not wired to the real POST beyond the storable set.

import {
  speciesLabel,
  commodityCodeFor,
  commodityNameFor
} from '../../commodities/index.js'

const compact = (obj) => {
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

const orUndefined = (obj) => (Object.keys(obj).length ? obj : undefined)

const isoFromDateParts = (parts) => {
  const { day, month, year } = parts ?? {}
  if (day == null || month == null || year == null) return undefined
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const datePartsFromIso = (iso) => {
  if (!iso) return undefined
  const [year, month, day] = iso.split('-')
  return { day: Number(day), month: Number(month), year: Number(year) }
}

// ---------------------------------------------------------------------------
// Shared builders (used by both mappers)
// ---------------------------------------------------------------------------

// Species value → display name via the prototype's commodity reference data,
// falling back to the raw value for unknown codes — matching the skeleton's
// `speciesByValue.get(value) ?? value` resolution.
const speciesFromLine = (line) => {
  if (line.speciesSelection === undefined) return undefined
  return line.speciesSelection.map((species, index) => {
    const unit = line.animalIdentifiers?.[index] ?? {}
    return compact({
      value: species,
      text: speciesLabel(species) ?? species,
      noOfAnimals: line.numberOfAnimalsQuantity,
      noOfPackages: line.numberOfPackages,
      earTag: unit.animalIdentifierEarTag,
      passport: unit.animalIdentifierPassport
    })
  })
}

const identifiersFromSpecies = (species = []) => {
  const units = species.map((entry) =>
    compact({
      animalIdentifierEarTag: entry.earTag,
      animalIdentifierPassport: entry.passport
    })
  )
  return units.some((unit) => Object.keys(unit).length > 0) ? units : undefined
}

// The whole backend Transporter {name,address,approvalNumber,type}, built from
// whichever of the mutually-exclusive commercial/private transporter answers is
// present plus the transporterType. Matches the skeleton, which persists the
// entire transporter object under transport.transporter.
const transporterFromAnswers = (answers) => {
  const source = answers.commercialTransporter ?? answers.privateTransporter
  return orUndefined(
    compact({
      name: source?.name,
      address: source?.address,
      approvalNumber: source?.approvalNumber,
      type: answers.transporterType
    })
  )
}

const transporterToAnswers = (transporter) => {
  const out = {}
  if (transporter.type !== undefined) out.transporterType = transporter.type
  const party = orUndefined(
    compact({
      name: transporter.name,
      address: transporter.address,
      approvalNumber: transporter.approvalNumber
    })
  )
  if (party) {
    if (transporter.type === 'Private') {
      out.privateTransporter = party
    } else {
      out.commercialTransporter = party
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Mapper A — skeleton-exact backend notification
// ---------------------------------------------------------------------------

// Skeleton parity: the commodity-complement totals are numbers in the
// notification (the skeleton computes them via a lodash sum), while the
// per-species noOfAnimals/noOfPackages stay the raw string answers.
const toNum = (v) => (v == null ? undefined : Number(v))

const baseComplementFromLine = (line) =>
  compact({
    typeOfCommodity: line.typeSelection,
    totalNoOfAnimals: toNum(line.numberOfAnimalsQuantity),
    totalNoOfPackages: toNum(line.numberOfPackages),
    species: speciesFromLine(line)
  })

const commodityFromLinesA = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) return undefined
  return {
    name: lines[0].commoditySelection,
    commodityComplement: lines.map(baseComplementFromLine)
  }
}

export const answersToNotification = (answers = {}) => {
  const notification = {}

  if (answers.referenceNumber !== undefined) {
    notification.referenceNumber = answers.referenceNumber
  }

  const origin = orUndefined(
    compact({
      countryCode: answers.countryOfOrigin,
      requiresRegionCode: answers.regionOfOriginCodeRequirement,
      internalReference: answers.internalReferenceNumber
    })
  )
  if (origin) notification.origin = origin

  const additionalDetails = orUndefined(
    compact({
      certifiedFor: answers.animalsCertifiedFor,
      unweanedAnimals: answers.containsUnweanedAnimals
    })
  )
  if (additionalDetails) notification.additionalDetails = additionalDetails

  if (answers.reasonForImport !== undefined) {
    notification.reasonForImport = answers.reasonForImport
  }

  if (answers.placeOfOrigin !== undefined) {
    notification.placeOfOrigin = answers.placeOfOrigin
  }
  if (answers.consignor !== undefined) {
    notification.consignor = answers.consignor
  }
  if (answers.consignee !== undefined) {
    notification.consignee = answers.consignee
  }
  if (answers.importer !== undefined) notification.importer = answers.importer
  if (answers.placeOfDestination !== undefined) {
    notification.destination = answers.placeOfDestination
  }
  if (answers.contactAddress !== undefined) {
    notification.consignment = answers.contactAddress
  }
  if (answers.countyParishHoldingCph !== undefined) {
    notification.cphNumber = answers.countyParishHoldingCph
  }

  const transport = orUndefined(
    compact({
      portOfEntry: answers.portOfEntry,
      arrivalDate: isoFromDateParts(answers.arrivalDateAtPort),
      transporter: transporterFromAnswers(answers)
    })
  )
  if (transport) notification.transport = transport

  const commodity = commodityFromLinesA(answers.commodityLines)
  if (commodity) notification.commodity = commodity

  return notification
}

const linesFromCommodityA = (commodity) => {
  if (!commodity || !Array.isArray(commodity.commodityComplement)) {
    return undefined
  }
  return commodity.commodityComplement.map((complement, index) =>
    compact({
      commoditySelection: index === 0 ? commodity.name : undefined,
      typeSelection: complement.typeOfCommodity,
      speciesSelection: complement.species
        ? complement.species.map((entry) => entry.value)
        : undefined,
      numberOfPackages:
        complement.totalNoOfPackages == null
          ? undefined
          : String(complement.totalNoOfPackages),
      numberOfAnimalsQuantity:
        complement.totalNoOfAnimals == null
          ? undefined
          : String(complement.totalNoOfAnimals),
      animalIdentifiers: identifiersFromSpecies(complement.species)
    })
  )
}

export const notificationToAnswers = (notification = {}) => {
  const answers = {}
  const { origin, additionalDetails, transport } = notification

  if (notification.referenceNumber !== undefined) {
    answers.referenceNumber = notification.referenceNumber
  }

  if (origin?.countryCode !== undefined) {
    answers.countryOfOrigin = origin.countryCode
  }
  if (origin?.requiresRegionCode !== undefined) {
    answers.regionOfOriginCodeRequirement = origin.requiresRegionCode
  }
  if (origin?.internalReference !== undefined) {
    answers.internalReferenceNumber = origin.internalReference
  }

  if (additionalDetails?.certifiedFor !== undefined) {
    answers.animalsCertifiedFor = additionalDetails.certifiedFor
  }
  if (additionalDetails?.unweanedAnimals !== undefined) {
    answers.containsUnweanedAnimals = additionalDetails.unweanedAnimals
  }

  if (notification.reasonForImport !== undefined) {
    answers.reasonForImport = notification.reasonForImport
  }

  if (notification.placeOfOrigin !== undefined) {
    answers.placeOfOrigin = notification.placeOfOrigin
  }
  if (notification.consignor !== undefined) {
    answers.consignor = notification.consignor
  }
  if (notification.consignee !== undefined) {
    answers.consignee = notification.consignee
  }
  if (notification.importer !== undefined) {
    answers.importer = notification.importer
  }
  if (notification.destination !== undefined) {
    answers.placeOfDestination = notification.destination
  }
  if (notification.consignment !== undefined) {
    answers.contactAddress = notification.consignment
  }
  if (notification.cphNumber !== undefined) {
    answers.countyParishHoldingCph = notification.cphNumber
  }

  if (transport?.portOfEntry !== undefined) {
    answers.portOfEntry = transport.portOfEntry
  }
  if (transport?.arrivalDate !== undefined) {
    answers.arrivalDateAtPort = datePartsFromIso(transport.arrivalDate)
  }
  if (transport?.transporter !== undefined) {
    Object.assign(answers, transporterToAnswers(transport.transporter))
  }

  const commodityLines = linesFromCommodityA(notification.commodity)
  if (commodityLines) answers.commodityLines = commodityLines

  return answers
}

// ---------------------------------------------------------------------------
// Mapper B — Mapper A plus the extra fields (lossless on all 46 obligations)
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

const unitFromTarget = (unit) =>
  compact({
    animalIdentifierPassport: unit.passport,
    animalIdentifierTattoo: unit.tattoo,
    animalIdentifierEarTag: unit.earTag,
    horseName: unit.horseName,
    animalIdentifierIdentificationDetails: unit.identificationDetails,
    animalIdentifierDescription: unit.description,
    permanentAddress: unit.permanentAddress
  })

// Mapper A's commodity, with each complement enriched by the extra
// commodityCode and full per-animal identifiers.
const targetCommodityFromLines = (lines) => {
  const base = commodityFromLinesA(lines)
  if (!base) return undefined
  return {
    ...base,
    commodityComplement: base.commodityComplement.map((complement, index) => {
      const line = lines[index]
      return compact({
        commodityCode:
          commodityCodeFor(line.commoditySelection) ?? line.commoditySelection,
        ...complement,
        animalIdentifiers:
          line.animalIdentifiers === undefined
            ? undefined
            : line.animalIdentifiers.map(targetUnit)
      })
    })
  }
}

const targetLinesFromCommodity = (commodity) => {
  const base = linesFromCommodityA(commodity)
  if (!base) return undefined
  return base.map((line, index) => {
    const complement = commodity.commodityComplement[index]
    return compact({
      ...line,
      commoditySelection:
        complement.commodityCode === undefined
          ? line.commoditySelection
          : (commodityNameFor(complement.commodityCode) ??
            complement.commodityCode),
      animalIdentifiers:
        complement.animalIdentifiers === undefined
          ? line.animalIdentifiers
          : complement.animalIdentifiers.map(unitFromTarget)
    })
  })
}

const targetDocuments = (documents) => {
  if (!Array.isArray(documents) || documents.length === 0) return undefined
  return documents.map((doc) =>
    compact({
      documentType: doc.accompanyingDocumentType,
      attachmentType: doc.accompanyingDocumentAttachmentType,
      reference: doc.accompanyingDocumentReference,
      dateOfIssue: doc.accompanyingDocumentDateOfIssue
    })
  )
}

const documentsFromTarget = (documents) => {
  if (!Array.isArray(documents)) return undefined
  return documents.map((doc) =>
    compact({
      accompanyingDocumentType: doc.documentType,
      accompanyingDocumentAttachmentType: doc.attachmentType,
      accompanyingDocumentReference: doc.reference,
      accompanyingDocumentDateOfIssue: doc.dateOfIssue
    })
  )
}

export const answersToTargetNotification = (answers = {}) => {
  const notification = answersToNotification(answers)

  if (answers.responsiblePersonForLoad !== undefined) {
    notification.responsiblePersonForLoad = answers.responsiblePersonForLoad
  }
  if (answers.purposeInInternalMarket !== undefined) {
    notification.purpose = answers.purposeInInternalMarket
  }
  if (answers.declaration !== undefined) {
    notification.declaration = answers.declaration
  }

  if (answers.regionOfOriginCode !== undefined) {
    notification.origin = {
      ...notification.origin,
      regionCode: answers.regionOfOriginCode
    }
  }

  const transportExtras = compact({
    meansOfTransport: answers.meansOfTransport,
    transportIdentification: answers.transportIdentification,
    transportDocumentReference: answers.transportDocumentReference,
    transitedCountries: answers.transitedCountries
  })
  if (Object.keys(transportExtras).length) {
    notification.transport = { ...notification.transport, ...transportExtras }
  }

  const commodity = targetCommodityFromLines(answers.commodityLines)
  if (commodity) notification.commodity = commodity

  const documents = targetDocuments(answers.documents)
  if (documents) notification.documents = documents

  return notification
}

export const targetNotificationToAnswers = (notification = {}) => {
  const answers = notificationToAnswers(notification)
  const { origin, transport } = notification

  if (notification.responsiblePersonForLoad !== undefined) {
    answers.responsiblePersonForLoad = notification.responsiblePersonForLoad
  }
  if (notification.purpose !== undefined) {
    answers.purposeInInternalMarket = notification.purpose
  }
  if (notification.declaration !== undefined) {
    answers.declaration = notification.declaration
  }

  if (origin?.regionCode !== undefined) {
    answers.regionOfOriginCode = origin.regionCode
  }

  if (transport?.meansOfTransport !== undefined) {
    answers.meansOfTransport = transport.meansOfTransport
  }
  if (transport?.transportIdentification !== undefined) {
    answers.transportIdentification = transport.transportIdentification
  }
  if (transport?.transportDocumentReference !== undefined) {
    answers.transportDocumentReference = transport.transportDocumentReference
  }
  if (transport?.transitedCountries !== undefined) {
    answers.transitedCountries = transport.transitedCountries
  }

  const commodityLines = targetLinesFromCommodity(notification.commodity)
  if (commodityLines) answers.commodityLines = commodityLines

  const documents = documentsFromTarget(notification.documents)
  if (documents) answers.documents = documents

  return answers
}
