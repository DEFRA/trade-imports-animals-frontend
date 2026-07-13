// Native bidirectional mappers between the engine's obligation-id-keyed
// `answers` and a backend `notification`. Production notification-client.js is
// left untouched — the arrival-date transform is copied here, not imported.
//
// Mapper A targets the CURRENT backend notification: total on the 26 mapped
// obligations, lossy on the 20 gaps (the gap keys have no backend home).
// Mapper B targets a PROPOSED superset notification with a typed home for every
// one of the 46 obligations — a lossless round-trip demonstrator, not wired to
// the real POST.

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
// Mapper A — current backend shape
// ---------------------------------------------------------------------------

const speciesFromLineA = (line) => {
  if (line.speciesSelection === undefined) return undefined
  return line.speciesSelection.map((species, index) => {
    const unit = line.animalIdentifiers?.[index] ?? {}
    return compact({
      value: species,
      text: species,
      noOfAnimals: line.numberOfAnimalsQuantity,
      noOfPackages: line.numberOfPackages,
      earTag: unit.animalIdentifierEarTag,
      passport: unit.animalIdentifierPassport
    })
  })
}

const commodityFromLinesA = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) return undefined
  return {
    name: lines[0].commoditySelection,
    commodityComplement: lines.map((line) =>
      compact({
        typeOfCommodity: line.typeSelection,
        totalNoOfAnimals: line.numberOfAnimalsQuantity,
        totalNoOfPackages: line.numberOfPackages,
        species: speciesFromLineA(line)
      })
    )
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
      transporter: answers.commercialTransporter
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
  return commodity.commodityComplement.map((complement, index) => {
    const species = complement.species ?? []
    const animalIdentifiers = species.map((entry) =>
      compact({
        animalIdentifierEarTag: entry.earTag,
        animalIdentifierPassport: entry.passport
      })
    )
    const hasIdentifiers = animalIdentifiers.some(
      (unit) => Object.keys(unit).length > 0
    )
    return compact({
      commoditySelection: index === 0 ? commodity.name : undefined,
      typeSelection: complement.typeOfCommodity,
      speciesSelection: complement.species
        ? species.map((entry) => entry.value)
        : undefined,
      numberOfPackages: complement.totalNoOfPackages,
      numberOfAnimalsQuantity: complement.totalNoOfAnimals,
      animalIdentifiers: hasIdentifiers ? animalIdentifiers : undefined
    })
  })
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
    answers.commercialTransporter = transport.transporter
  }

  const commodityLines = linesFromCommodityA(notification.commodity)
  if (commodityLines) answers.commodityLines = commodityLines

  return answers
}

// ---------------------------------------------------------------------------
// Mapper B — proposed target superset (lossless on all 46 obligations)
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

const targetCommodityFromLines = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) return undefined
  return {
    name: lines[0].commoditySelection,
    commodityComplement: lines.map((line) =>
      compact({
        commodityCode: line.commoditySelection,
        typeOfCommodity: line.typeSelection,
        totalNoOfAnimals: line.numberOfAnimalsQuantity,
        totalNoOfPackages: line.numberOfPackages,
        species: speciesFromLineA(line),
        animalIdentifiers:
          line.animalIdentifiers === undefined
            ? undefined
            : line.animalIdentifiers.map(targetUnit)
      })
    )
  }
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

const targetLinesFromCommodity = (commodity) => {
  if (!commodity || !Array.isArray(commodity.commodityComplement)) {
    return undefined
  }
  return commodity.commodityComplement.map((complement, index) =>
    compact({
      commoditySelection:
        complement.commodityCode ?? (index === 0 ? commodity.name : undefined),
      typeSelection: complement.typeOfCommodity,
      speciesSelection:
        complement.species === undefined
          ? undefined
          : complement.species.map((entry) => entry.value),
      numberOfPackages: complement.totalNoOfPackages,
      numberOfAnimalsQuantity: complement.totalNoOfAnimals,
      animalIdentifiers:
        complement.animalIdentifiers === undefined
          ? identifiersFromSpecies(complement.species)
          : complement.animalIdentifiers.map(unitFromTarget)
    })
  )
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

const targetTransporter = (answers) => {
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
    if (transporter.type === 'Private transporter') {
      out.privateTransporter = party
    } else {
      out.commercialTransporter = party
    }
  }
  return out
}

export const answersToTargetNotification = (answers = {}) => {
  const notification = {}

  if (answers.referenceNumber !== undefined) {
    notification.referenceNumber = answers.referenceNumber
  }
  if (answers.responsiblePersonForLoad !== undefined) {
    notification.responsiblePersonForLoad = answers.responsiblePersonForLoad
  }

  const origin = orUndefined(
    compact({
      countryCode: answers.countryOfOrigin,
      requiresRegionCode: answers.regionOfOriginCodeRequirement,
      regionCode: answers.regionOfOriginCode,
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
  if (answers.purposeInInternalMarket !== undefined) {
    notification.purpose = answers.purposeInInternalMarket
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
  if (answers.declaration !== undefined) {
    notification.declaration = answers.declaration
  }

  const transport = orUndefined(
    compact({
      portOfEntry: answers.portOfEntry,
      arrivalDate: isoFromDateParts(answers.arrivalDateAtPort),
      transporter: targetTransporter(answers),
      meansOfTransport: answers.meansOfTransport,
      transportIdentification: answers.transportIdentification,
      transportDocumentReference: answers.transportDocumentReference,
      transitedCountries: answers.transitedCountries
    })
  )
  if (transport) notification.transport = transport

  const commodity = targetCommodityFromLines(answers.commodityLines)
  if (commodity) notification.commodity = commodity

  const documents = targetDocuments(answers.documents)
  if (documents) notification.documents = documents

  return notification
}

export const targetNotificationToAnswers = (notification = {}) => {
  const answers = {}
  const { origin, additionalDetails, transport } = notification

  if (notification.referenceNumber !== undefined) {
    answers.referenceNumber = notification.referenceNumber
  }
  if (notification.responsiblePersonForLoad !== undefined) {
    answers.responsiblePersonForLoad = notification.responsiblePersonForLoad
  }

  if (origin?.countryCode !== undefined) {
    answers.countryOfOrigin = origin.countryCode
  }
  if (origin?.requiresRegionCode !== undefined) {
    answers.regionOfOriginCodeRequirement = origin.requiresRegionCode
  }
  if (origin?.regionCode !== undefined) {
    answers.regionOfOriginCode = origin.regionCode
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
  if (notification.purpose !== undefined) {
    answers.purposeInInternalMarket = notification.purpose
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
  if (notification.declaration !== undefined) {
    answers.declaration = notification.declaration
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
