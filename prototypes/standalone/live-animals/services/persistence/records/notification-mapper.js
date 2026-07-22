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
// A plus the extra fields — a lossless round-trip demonstrator over every
// captured obligation, including the per-species commodity lines. It reuses
// Mapper A's builders and layers the extras on top; it is not wired to the real
// POST beyond the storable set.

import {
  speciesLabel,
  commodityCodeFor,
  commodityNameFor
} from '../../commodities/index.js'

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

const datePartsFromIso = (iso) => {
  if (!iso) return undefined
  const [year, month, day] = iso.split('-')
  return { day: Number(day), month: Number(month), year: Number(year) }
}

// ---------------------------------------------------------------------------
// Shared builders (used by both mappers)
// ---------------------------------------------------------------------------

// The store is line-per-species (inc-062): a commodity line is one commodity
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

const identifiersFromSpeciesEntry = (entry) => {
  const unit = compact({
    animalIdentifierEarTag: entry.earTag,
    animalIdentifierPassport: entry.passport
  })
  return Object.keys(unit).length > 0 ? [unit] : undefined
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

// One complement per commodity group. The complement totals are numbers (the
// skeleton computes them via a lodash sum over the per-species counts), while
// the per-species noOfAnimals/noOfPackages stay the raw string answers.
const baseComplementFromGroup = (group) => {
  const species = speciesLines(group).map(speciesEntryFromLine)
  return compact({
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

const directFieldsFrom = (answers) =>
  compact({
    referenceNumber: answers.referenceNumber,
    reasonForImport: answers.reasonForImport,
    placeOfOrigin: answers.placeOfOrigin,
    consignor: answers.consignor,
    consignee: answers.consignee,
    importer: answers.importer,
    destination: answers.placeOfDestination,
    consignment: answers.contactAddress,
    cphNumber: answers.countyParishHoldingCph
  })

const originFrom = (answers) =>
  orUndefined(
    compact({
      countryCode: answers.countryOfOrigin,
      requiresRegionCode: answers.regionOfOriginCodeRequirement,
      internalReference: answers.internalReferenceNumber
    })
  )

const additionalDetailsFrom = (answers) =>
  orUndefined(
    compact({
      certifiedFor: answers.animalsCertifiedFor,
      unweanedAnimals: answers.containsUnweanedAnimals
    })
  )

const transportFrom = (answers) =>
  orUndefined(
    compact({
      portOfEntry: answers.portOfEntry,
      arrivalDate: isoFromDateParts(answers.arrivalDateAtPort),
      transporter: transporterFromAnswers(answers)
    })
  )

export const answersToNotification = (answers = {}) => {
  const notification = { ...directFieldsFrom(answers) }

  const origin = originFrom(answers)
  if (origin) notification.origin = origin

  const additionalDetails = additionalDetailsFrom(answers)
  if (additionalDetails) notification.additionalDetails = additionalDetails

  const transport = transportFrom(answers)
  if (transport) notification.transport = transport

  const commodity = commodityFromLinesA(answers.commodityLines)
  if (commodity) notification.commodity = commodity

  return notification
}

// One line per species entry, recovering the per-species counts from the
// species entries themselves. The commodity name attributes only to the FIRST
// complement — the skeleton notification carries a single top-level name, so
// later groups' commodity identity does not survive a Mapper A round-trip
// (the known lossy-A caveat; see docs/persistence.md).
const lineFromSpeciesEntry = (commodityName) => (entry) =>
  compact({
    commoditySelection: commodityName,
    speciesSelection: entry.value,
    numberOfPackages: entry.noOfPackages,
    numberOfAnimalsQuantity: entry.noOfAnimals,
    animalIdentifiers: identifiersFromSpeciesEntry(entry)
  })

const linesFromCommodityA = (commodity) => {
  if (!commodity || !Array.isArray(commodity.commodityComplement)) {
    return undefined
  }
  return commodity.commodityComplement.flatMap((complement, index) =>
    (complement.species ?? [{}]).map(
      lineFromSpeciesEntry(index === 0 ? commodity.name : undefined)
    )
  )
}

const directAnswersFrom = (notification) =>
  compact({
    referenceNumber: notification.referenceNumber,
    reasonForImport: notification.reasonForImport,
    placeOfOrigin: notification.placeOfOrigin,
    consignor: notification.consignor,
    consignee: notification.consignee,
    importer: notification.importer,
    placeOfDestination: notification.destination,
    contactAddress: notification.consignment,
    countyParishHoldingCph: notification.cphNumber
  })

const originAnswersFrom = (origin) =>
  compact({
    countryOfOrigin: origin?.countryCode,
    regionOfOriginCodeRequirement: origin?.requiresRegionCode,
    internalReferenceNumber: origin?.internalReference
  })

const additionalDetailsAnswersFrom = (additionalDetails) =>
  compact({
    animalsCertifiedFor: additionalDetails?.certifiedFor,
    containsUnweanedAnimals: additionalDetails?.unweanedAnimals
  })

const transportAnswersFrom = (transport) => {
  const answers = compact({
    portOfEntry: transport?.portOfEntry,
    arrivalDateAtPort: datePartsFromIso(transport?.arrivalDate)
  })
  if (transport?.transporter !== undefined) {
    Object.assign(answers, transporterToAnswers(transport.transporter))
  }
  return answers
}

export const notificationToAnswers = (notification = {}) => {
  const { origin, additionalDetails, transport } = notification
  const answers = {
    ...directAnswersFrom(notification),
    ...originAnswersFrom(origin),
    ...additionalDetailsAnswersFrom(additionalDetails),
    ...transportAnswersFrom(transport)
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

// Reconstructs the per-species lines. Falls back to Mapper A's recovery when
// the extras were stripped (e.g. by a backend that only keeps the storable
// field set): first group takes the top-level name, per-species earTag/
// passport become the line's single identifier unit.
// 3-step name-resolution fallback: complement.name, else commodityCode
// resolved via the reference-data lookup (or the raw code if unknown),
// else the top-level commodity name (first complement only).
const commodityNameForComplement = (commodity, complement, index) => {
  const fallbackName = index === 0 ? commodity.name : undefined
  const codeName =
    complement.commodityCode === undefined
      ? fallbackName
      : (commodityNameFor(complement.commodityCode) ?? complement.commodityCode)
  return complement.name ?? codeName
}

const identifiersFromEntry = (entry) =>
  entry.animalIdentifiers === undefined
    ? identifiersFromSpeciesEntry(entry)
    : entry.animalIdentifiers.map(unitFromTarget)

const targetLinesFromCommodity = (commodity) => {
  if (!commodity || !Array.isArray(commodity.commodityComplement)) {
    return undefined
  }
  return commodity.commodityComplement.flatMap((complement, index) => {
    const name = commodityNameForComplement(commodity, complement, index)
    return (complement.species ?? [{}]).map((entry) =>
      compact({
        ...lineFromSpeciesEntry(name)(entry),
        animalIdentifiers: identifiersFromEntry(entry)
      })
    )
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

const originWithRegion = (notification, answers) =>
  answers.regionOfOriginCode !== undefined
    ? { ...notification.origin, regionCode: answers.regionOfOriginCode }
    : notification.origin

const transportWithExtras = (notification, answers) => {
  const extras = compact({
    meansOfTransport: answers.meansOfTransport,
    transportIdentification: answers.transportIdentification,
    transportDocumentReference: answers.transportDocumentReference,
    transitedCountries: answers.transitedCountries
  })
  return Object.keys(extras).length
    ? { ...notification.transport, ...extras }
    : notification.transport
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

  const origin = originWithRegion(notification, answers)
  if (origin !== undefined) notification.origin = origin

  const transport = transportWithExtras(notification, answers)
  if (transport !== undefined) notification.transport = transport

  const commodity = targetCommodityFromLines(answers.commodityLines)
  if (commodity) notification.commodity = commodity

  const documents = targetDocuments(answers.documents)
  if (documents) notification.documents = documents

  return notification
}

const directTargetAnswersFrom = (notification) =>
  compact({
    responsiblePersonForLoad: notification.responsiblePersonForLoad,
    purposeInInternalMarket: notification.purpose,
    declaration: notification.declaration,
    regionOfOriginCode: notification.origin?.regionCode
  })

const transportExtrasAnswersFrom = (transport) =>
  compact({
    meansOfTransport: transport?.meansOfTransport,
    transportIdentification: transport?.transportIdentification,
    transportDocumentReference: transport?.transportDocumentReference,
    transitedCountries: transport?.transitedCountries
  })

export const targetNotificationToAnswers = (notification = {}) => {
  const answers = {
    ...notificationToAnswers(notification),
    ...directTargetAnswersFrom(notification),
    ...transportExtrasAnswersFrom(notification.transport)
  }

  const commodityLines = targetLinesFromCommodity(notification.commodity)
  if (commodityLines) answers.commodityLines = commodityLines

  const documents = documentsFromTarget(notification.documents)
  if (documents) answers.documents = documents

  return answers
}
