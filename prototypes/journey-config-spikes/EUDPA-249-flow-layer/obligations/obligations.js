/**
 * Obligations — Live Animals V4 data-field model.
 *
 * Source: Confluence "Live Animals Data Fields - V4" (page 6497338582).
 * Model under test: obligations model from EUDPA-249 spike (see
 * ../obligations/). This manifest expresses the V4 domain against that
 * model; see GAPS.md for gaps discovered and how they were closed.
 *
 * Scope mechanism: every obligation with a conditional scope uses
 * `applyTo(fulfilments, fulfilmentIdsByObligationId)`. Common gate
 * shapes are provided as pure helper functions in `helpers.js` —
 * `allowListed`, `allowListedByPredicate`, `branchedGate`,
 * `anyAllowListed` — that build applyTo functions with metadata
 * attached for optional introspection. One mechanism, one testing
 * story: any obligation's applyTo can be exercised as a plain function
 * call with plain inputs (no evaluator, no resolver, no obligationsById).
 *
 * System-populated fields (Reference Number, gov.identity-fed
 * Responsible Person, MDM-sourced enum values) are stubbed in test
 * fixtures rather than modelled as obligations.
 *
 * Standard address block: modelled as a single-cardinality obligation
 * whose stored value is a composite `{ name, addressLine1,
 * addressLine2?, town, county?, postCode, country, telephone, email }`.
 * Field-level validation of the composite (max-length, formats,
 * mandatory subfields) is out of scope of the obligation model.
 */

import {
  allowListed,
  allowListedByPredicate,
  anyAllowListed,
  branchedGate
} from './helpers.js'

// -----------------------------------------------------------------------------
// Reason constants — collected here so obligation declarations stay tight.
// -----------------------------------------------------------------------------

const regionCodeRequiredReason = {
  code: 'obligation.regionCode.mandatory.becauseRegionCodeRequired',
  explanation: 'regionCode is mandatory when regionCodeRequirement is yes'
}

const purposeInInternalMarketReason = {
  code: 'obligation.purposeInInternalMarket.applicable.becauseInternalMarket',
  explanation:
    'purposeInInternalMarket applies when reasonForImport is internal-market'
}

const commercialTransporterReason = {
  code: 'obligation.commercialTransporter.applicable.becauseCommercial',
  explanation:
    'commercialTransporter applies when transporterType is commercial'
}

const privateTransporterReason = {
  code: 'obligation.privateTransporter.applicable.becausePrivate',
  explanation: 'privateTransporter applies when transporterType is private'
}

const transitedCountriesReason = {
  code: 'obligation.transitedCountries.applicable.becauseLandTransport',
  explanation:
    'transitedCountries applies when meansOfTransport is railway or road-vehicle'
}

const numberOfPackagesReason = {
  code: 'obligation.numberOfPackages.applicable.becausePackageCountCommodity',
  explanation:
    'numberOfPackages applies on lines whose commodityCode is in the package-count list'
}

const cphReason = {
  code: 'obligation.cph.applicable.becauseCphCommodity',
  explanation:
    'CPH applies when any commodity line has a CPH-required commodityCode'
}

const passportReason = {
  code: 'obligation.passport.applicable.becausePassportCommodity',
  explanation:
    'passport applies on units of lines whose commodityCode is in the passport list'
}

const tattooReason = {
  code: 'obligation.tattoo.applicable.becauseTattooCommodity',
  explanation:
    'tattoo applies on units of lines whose commodityCode is in the tattoo list'
}

const earTagReason = {
  code: 'obligation.earTag.applicable.becauseEarTagCommodity',
  explanation:
    'earTag applies on units of lines whose commodityCode is in the ear-tag list'
}

const horseNameReason = {
  code: 'obligation.horseName.applicable.becauseHorseCommodity',
  explanation: 'horseName applies on units of horse-commodity lines'
}

const identificationDetailsReason = {
  code: 'obligation.identificationDetails.applicable.becauseNoSpecificIdentifier',
  explanation:
    'identificationDetails applies on units of lines whose commodityCode has no specific identifier type'
}

const descriptionReason = {
  code: 'obligation.description.applicable.becauseNoSpecificIdentifier',
  explanation:
    'description applies on units of lines whose commodityCode has no specific identifier type'
}

const permanentAddressReason = {
  code: 'obligation.permanentAddress.applicable.becausePermanentAddressCommodity',
  explanation:
    'permanentAddress applies on units of lines whose commodityCode requires per-animal permanent address'
}

const accompanyingDocumentBlockReason = {
  code: 'obligation.accompanyingDocument.mandatory.becauseAnyFieldPresent',
  explanation:
    'accompanying document fields become mandatory once any one is filled'
}

// -----------------------------------------------------------------------------
// Country of origin + regionCode conditional gate
// -----------------------------------------------------------------------------

export const countryOfOrigin = {
  id: 'a01b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  name: 'countryOfOrigin',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const regionCodeRequirement = {
  id: 'b12c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
  name: 'regionCodeRequirement',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Retain-value pattern: always in scope; mandatory when
// regionCodeRequirement === 'yes', optional otherwise. Stored values
// are kept across gate flips (V4 spec: the field itself is not purged
// on `no`).
export const regionCode = {
  id: 'c23d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
  name: 'regionCode',
  applyTo: branchedGate(
    (fulfilments) => fulfilments[regionCodeRequirement.id] === 'yes',
    { inScope: true, status: 'mandatory', reasons: [regionCodeRequiredReason] },
    { inScope: true, status: 'optional' }
  )
}

// -----------------------------------------------------------------------------
// Reason for import + purpose in internal market
// -----------------------------------------------------------------------------

export const reasonForImport = {
  id: 'd34e5f6a-7b8c-4d9e-8f01-2a3b4c5d6e7f',
  name: 'reasonForImport',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Purge-on-flip: when reasonForImport is not 'internal-market',
// purposeInInternalMarket goes out of scope and any stored value is
// dropped.
export const purposeInInternalMarket = {
  id: 'e45f6a7b-8c9d-4e01-8f23-4a5b6c7d8e9f',
  name: 'purposeInInternalMarket',
  applyTo: branchedGate(
    (fulfilments) => fulfilments[reasonForImport.id] === 'internal-market',
    {
      inScope: true,
      status: 'mandatory',
      reasons: [purposeInInternalMarketReason]
    },
    { inScope: false }
  )
}

// -----------------------------------------------------------------------------
// Contains unweaned animals
// -----------------------------------------------------------------------------

export const containsUnweanedAnimals = {
  id: '01a2b3c4-d5e6-4f07-8a89-0b1c2d3e4f5a',
  name: 'containsUnweanedAnimals',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// -----------------------------------------------------------------------------
// Standard address blocks — always in scope. Composite value stored
// directly on the obligation id.
// -----------------------------------------------------------------------------

export const placeOfOrigin = {
  id: '89c0d1e2-f3a4-4b5f-8c0b-8d9e0f1a2b3c',
  name: 'placeOfOrigin',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const consignor = {
  id: '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d',
  name: 'consignor',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const consignee = {
  id: 'abe2f3a4-b5c6-4d71-8e2d-af0a1b2c3d4e',
  name: 'consignee',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const importer = {
  id: 'bcf3a4b5-c6d7-4e82-8f3e-ba1b2c3d4e5f',
  name: 'importer',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const placeOfDestination = {
  id: 'cd04b5c6-d7e8-4f93-8a4f-cb2c3d4e5f60',
  name: 'placeOfDestination',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// -----------------------------------------------------------------------------
// Transporter type + mutually-exclusive address blocks
// -----------------------------------------------------------------------------

export const transporterType = {
  id: '34d5e6f7-a8b9-4c0a-8dbc-3e4f5a6b7c8d',
  name: 'transporterType',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Purge-on-flip: switching transporterType from 'commercial' to
// 'private' drops any stored commercialTransporter address.
export const commercialTransporter = {
  id: 'de15c6d7-e8f9-4a04-8b50-dc3d4e5f6071',
  name: 'commercialTransporter',
  applyTo: branchedGate(
    (fulfilments) => fulfilments[transporterType.id] === 'commercial',
    {
      inScope: true,
      status: 'mandatory',
      reasons: [commercialTransporterReason]
    },
    { inScope: false }
  )
}

export const privateTransporter = {
  id: 'ef26d7e8-f9a0-4b15-8c61-ed4e5f607182',
  name: 'privateTransporter',
  applyTo: branchedGate(
    (fulfilments) => fulfilments[transporterType.id] === 'private',
    {
      inScope: true,
      status: 'mandatory',
      reasons: [privateTransporterReason]
    },
    { inScope: false }
  )
}

// -----------------------------------------------------------------------------
// Means of transport + gated transited-countries multi-select
// -----------------------------------------------------------------------------

export const meansOfTransport = {
  id: '45e6f7a8-b9c0-4d1b-8ecd-4f5a6b7c8d9e',
  name: 'meansOfTransport',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const transportIdentification = {
  id: '56f7a8b9-c0d1-4e2c-8fde-5a6b7c8d9e0f',
  name: 'transportIdentification',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const transportDocumentReference = {
  id: '67a8b9c0-d1e2-4f3d-8aef-6b7c8d9e0f1a',
  name: 'transportDocumentReference',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Conditional in-scope-optional multi-select — stored as an array of
// country strings. Out of scope (and purged) when means-of-transport
// is not railway or road-vehicle.
const LAND_TRANSPORT_MODES = ['railway', 'road-vehicle']

export const transitedCountries = {
  id: '78b9c0d1-e2f3-4a4e-8bfa-7c8d9e0f1a2b',
  name: 'transitedCountries',
  applyTo: branchedGate(
    (fulfilments) =>
      LAND_TRANSPORT_MODES.includes(fulfilments[meansOfTransport.id]),
    {
      inScope: true,
      status: 'optional',
      reasons: [transitedCountriesReason]
    },
    { inScope: false }
  )
}

// -----------------------------------------------------------------------------
// Arrival at port
// -----------------------------------------------------------------------------

export const arrivalDateAtPort = {
  id: '12b3c4d5-e6f7-4a08-8b9a-1c2d3e4f5a6b',
  name: 'arrivalDateAtPort',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const portOfEntry = {
  id: '23c4d5e6-f7a8-4b09-8cab-2d3e4f5a6b7c',
  name: 'portOfEntry',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// -----------------------------------------------------------------------------
// Contact address (user-entered variant — gov.identity variant stubbed
// as pre-filled fulfilment per Q4)
// -----------------------------------------------------------------------------

export const contactAddress = {
  id: 'f037e8f9-a0b1-4c26-8d72-fe5f60718293',
  name: 'contactAddress',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// -----------------------------------------------------------------------------
// Internal reference (trader-entered)
// -----------------------------------------------------------------------------

export const internalReferenceNumber = {
  id: '10e5f607-1829-4a3b-84c5-06d7e8f9a0b1',
  name: 'internalReferenceNumber',
  applyTo: () => ({ inScope: true, status: 'optional' })
}

// -----------------------------------------------------------------------------
// Animals certified for (notification-level; spec notes APHA may make
// this commodity-gated later — modelled as always-mandatory for now)
// -----------------------------------------------------------------------------

export const animalsCertifiedFor = {
  id: '274c5d6e-7f80-4da4-8123-7de4f5061729',
  name: 'animalsCertifiedFor',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// -----------------------------------------------------------------------------
// Commodity line — user-driven indexed group. Each commodity line
// carries commodityCode + commodityType + species + numberOfAnimals and
// (conditionally) numberOfPackages. Line-instance ids are opaque
// orchestrator-generated ULIDs — mnemonic `line1` / `line2` etc. in
// tests and docs.
// -----------------------------------------------------------------------------

export const commodityLine = {
  id: '20e5f607-1829-4c3d-8abc-06d7e8f9a0b2',
  name: 'commodityLine'
  // No applyTo — structural group, always in scope. Instance ids
  // inferred from field-record composite-key prefixes.
}

export const commodityCode = {
  id: '21f60718-192a-4d4e-8bcd-17e8f9a0b1c3',
  name: 'commodityCode',
  within: commodityLine,
  status: 'mandatory'
}

// Spec: "Where applicable for given commodity, user is able to filter
// species by type." Ambiguous whether Type itself is commodity-gated
// or whether that phrase describes UX for species filtering. Modelled
// as unconditional field record for now.
export const commodityType = {
  id: '22071829-2a3b-4e5f-8cde-28f9a0b1c2d4',
  name: 'commodityType',
  within: commodityLine,
  status: 'mandatory'
}

// Multi-select; stored value is an array of species strings per line.
// The obligation model treats the array opaquely.
export const species = {
  id: '2318293a-3b4c-4f60-8def-39a0b1c2d3e5',
  name: 'species',
  within: commodityLine,
  status: 'mandatory'
}

export const numberOfAnimals = {
  id: '24192a3b-4c5d-4a71-8ef0-4ab1c2d3e4f6',
  name: 'numberOfAnimals',
  within: commodityLine,
  status: 'mandatory'
}

// Commodity codes for which V4 requires a package count. Subset of the
// 54 codes listed on the Confluence page — enough to exercise every
// pattern in tests.
export const PACKAGE_COUNT_COMMODITIES = [
  '01064100', // Bees
  '01063100', // Birds of Prey — Owls / Falcons / Other
  '01061900', // Cats / Dogs / Ferrets / Rodents
  '0102' // Cattle
]

// Depth-1 commodity-code-gated field record. `applyTo` returns records
// = matching line-ids; no projection group needed (the gate lives at
// the same identity level as the gated obligation).
export const numberOfPackages = {
  id: '252a3b4c-5d6e-4b82-8f01-5bc2d3e4f507',
  name: 'numberOfPackages',
  within: commodityLine,
  status: 'optional',
  applyTo: allowListed(commodityCode, PACKAGE_COUNT_COMMODITIES, null, [
    numberOfPackagesReason
  ])
}

// -----------------------------------------------------------------------------
// CPH — notification-level single, aggregated across commodity lines.
// -----------------------------------------------------------------------------

// V4 CPH whitelist per Confluence page 6497338582 (updated
// 2026-07-07). Spec lists 19 species/product rows but the codes
// collapse to 17 unique values — 01059920/01059930 duplicate at
// species level (Geese and Turkeys share 04071911; Ducks and
// Guinea Fowl share 04071919). Iteration 10 shipped with the
// 4 mammal codes only; step 5a expands to the full whitelist so
// Poultry consignments correctly gate on CPH.
export const CPH_REQUIRED_COMMODITIES = [
  '0102', // Cattle
  '0103', // Pig (Domestic)
  '010410', // Sheep (Domestic)
  '010420', // Goats
  '01051111', // Poultry — Day-old chicks — Chickens
  '01051200', // Poultry — Day-old chicks — Turkeys
  '01051300', // Poultry — Day-old chicks — Ducks
  '01051400', // Poultry — Day-old chicks — Geese
  '01051500', // Poultry — Day-old chicks — Guinea Fowl
  '01059400', // Poultry — Adult Birds — Chickens
  '01059910', // Poultry — Adult Birds — Ducks
  '01059920', // Poultry — Adult Birds — Geese
  '01059930', // Poultry — Adult Birds — Turkeys
  '01059950', // Poultry — Adult Birds — Guinea Fowl
  '04071100', // Poultry — Hatching eggs — Chickens
  '04071911', // Poultry — Hatching eggs — Geese / Turkeys
  '04071919' //  Poultry — Hatching eggs — Ducks / Guinea Fowl
]

export const cph = {
  id: '263b4c5d-6e7f-4c93-8012-6cd3e4f50618',
  name: 'cph',
  applyTo: anyAllowListed(
    commodityCode,
    CPH_REQUIRED_COMMODITIES,
    { inScope: true, status: 'mandatory', reasons: [cphReason] },
    { inScope: false }
  )
}

// -----------------------------------------------------------------------------
// Unit record — nested user-driven indexed group inside commodityLine.
// Composite keys have length 2: `lineId/unitId`. Instance-ids are
// opaque orchestrator-generated ULIDs.
// -----------------------------------------------------------------------------

export const unitRecord = {
  id: '385d6e7f-8091-4eb5-8234-8ef506172940',
  name: 'unitRecord',
  within: commodityLine,
  // No applyTo — structural user-driven group, always in scope.
  //
  // V4 spec (Confluence page 6497338582): "Field Block - Mandatory
  // to Submit - At least one Animal Identifier". Every unit-record
  // must carry ≥ 1 of the six identifier obligations. The concrete
  // list is left as a lazy getter so this file doesn't force a
  // circular import against the identifier obligations declared
  // below. Consumers call `requires.anyOf()` to get the array.
  //
  // Engine primitive `groupInvariantErrors` walks in-scope
  // instances and emits one error per instance that violates the
  // invariant. `containerStatus` treats a violating instance as
  // "not fulfilled" so the per-unit-records subsection stays IP
  // until the user fixes it. See engine/index.js.
  requires: {
    get anyOf() {
      return [
        passport,
        tattoo,
        earTag,
        horseName,
        identificationDetails,
        description
      ]
    },
    errorCode: 'obligation.unitRecord.identifiersRequired'
  }
}

// -----------------------------------------------------------------------------
// Commodity-code whitelists for per-unit identifier gates. Subsets of
// the full V4 lists — enough to exercise every pattern in tests.
// -----------------------------------------------------------------------------

export const PASSPORT_COMMODITIES = [
  '0101', // Horse
  '0102', // Cattle
  '01061900' // Cats / Dogs / Ferrets
]

export const TATTOO_COMMODITIES = [
  '01061900', // Cats / Dogs / Ferrets
  '0103', // Pig
  '0102' // Bovine
]

export const EAR_TAG_COMMODITIES = [
  '0102', // Cattle
  '0103', // Pig
  '010410', // Sheep
  '010420' // Goats
]

export const HORSE_NAME_COMMODITIES = ['0101']

export const PERMANENT_ADDRESS_COMMODITIES = ['01061900']

// -----------------------------------------------------------------------------
// Per-unit identifier field records — depth-2, commodity-code-gated
// via `allowListed` with projection to unitRecord's instance-paths.
// The evaluator's pre-purge enumeration supplies the paths; the
// obligation code doesn't enumerate them itself.
// -----------------------------------------------------------------------------

export const passport = {
  id: '39657a80-91a2-4fc6-8345-9f0617284a51',
  name: 'passport',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, PASSPORT_COMMODITIES, unitRecord, [
    passportReason
  ])
}

export const tattoo = {
  id: '3a768b91-a2b3-4fd7-8456-a01728395b62',
  name: 'tattoo',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, TATTOO_COMMODITIES, unitRecord, [
    tattooReason
  ])
}

export const earTag = {
  id: '3b879ca2-b3c4-4fe8-8567-a1283a4a6c73',
  name: 'earTag',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, EAR_TAG_COMMODITIES, unitRecord, [
    earTagReason
  ])
}

export const horseName = {
  id: '3c98adb3-c4d5-4ff9-8678-a2394b5b7d84',
  name: 'horseName',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, HORSE_NAME_COMMODITIES, unitRecord, [
    horseNameReason
  ])
}

// Inverse gate — the free-text identifiers apply on units whose parent
// line's commodity has NO specific identifier. Expressed as a plain JS
// predicate.
const noSpecificIdentifier = (code) =>
  !PASSPORT_COMMODITIES.includes(code) &&
  !TATTOO_COMMODITIES.includes(code) &&
  !EAR_TAG_COMMODITIES.includes(code) &&
  !HORSE_NAME_COMMODITIES.includes(code)

export const identificationDetails = {
  id: '3da9bec4-d5e6-4a0a-8789-a34a5c6c8e95',
  name: 'identificationDetails',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListedByPredicate(
    commodityCode,
    noSpecificIdentifier,
    unitRecord,
    [identificationDetailsReason]
  )
}

export const description = {
  id: '3ebacfd5-e6f7-4b1b-889a-a45b6d7d9fa6',
  name: 'description',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListedByPredicate(
    commodityCode,
    noSpecificIdentifier,
    unitRecord,
    [descriptionReason]
  )
}

export const permanentAddress = {
  id: '3fcbd0e6-f708-4c2c-89ab-a56c7e8ea0b7',
  name: 'permanentAddress',
  within: unitRecord,
  status: 'mandatory',
  applyTo: allowListed(
    commodityCode,
    PERMANENT_ADDRESS_COMMODITIES,
    unitRecord,
    [permanentAddressReason]
  )
}

// -----------------------------------------------------------------------------
// Accompanying Documents — notification-level all-or-nothing block.
//
// Four fields sharing a single applyTo: optional when nothing is
// filled, mandatory once ANY field is filled (retain-value + status-
// swap via `branchedGate`).
//
// The predicate references all four obligations, including itself.
// Under gatedBy this required attach-after-declaration mutation; under
// applyTo the closure defers name resolution to call time, so the
// obligations are declared normally and each has its applyTo set at
// declaration.
// -----------------------------------------------------------------------------

const anyDocumentFieldPresent = (fulfilments) =>
  [
    accompanyingDocumentType,
    accompanyingDocumentAttachmentType,
    accompanyingDocumentReference,
    accompanyingDocumentDateOfIssue
  ].some((obligation) => fulfilments[obligation.id] !== undefined)

const accompanyingDocumentBlockApplyTo = branchedGate(
  anyDocumentFieldPresent,
  {
    inScope: true,
    status: 'mandatory',
    reasons: [accompanyingDocumentBlockReason]
  },
  { inScope: true, status: 'optional' }
)

export const accompanyingDocumentType = {
  id: '4fdce1f7-0819-4d3d-8abc-b67d8f9fa0c8',
  name: 'accompanyingDocumentType',
  applyTo: accompanyingDocumentBlockApplyTo
}

export const accompanyingDocumentAttachmentType = {
  id: '50ede208-1920-4e4e-8bcd-c78e9f0fb1d9',
  name: 'accompanyingDocumentAttachmentType',
  applyTo: accompanyingDocumentBlockApplyTo
}

export const accompanyingDocumentReference = {
  id: '51fef319-2a31-4f5f-8cde-d89fa010c2ea',
  name: 'accompanyingDocumentReference',
  applyTo: accompanyingDocumentBlockApplyTo
}

export const accompanyingDocumentDateOfIssue = {
  id: '5210042a-3b42-4a70-8def-e9a0b121d3fb',
  name: 'accompanyingDocumentDateOfIssue',
  applyTo: accompanyingDocumentBlockApplyTo
}

// -----------------------------------------------------------------------------
// Manifest — order does not affect evaluation (evaluator builds group
// hierarchy via `within` back-references).
// -----------------------------------------------------------------------------

export const obligations = [
  countryOfOrigin,
  regionCodeRequirement,
  regionCode,
  reasonForImport,
  purposeInInternalMarket,
  containsUnweanedAnimals,
  placeOfOrigin,
  consignor,
  consignee,
  importer,
  placeOfDestination,
  transporterType,
  commercialTransporter,
  privateTransporter,
  meansOfTransport,
  transportIdentification,
  transportDocumentReference,
  transitedCountries,
  arrivalDateAtPort,
  portOfEntry,
  contactAddress,
  internalReferenceNumber,
  animalsCertifiedFor,
  commodityLine,
  commodityCode,
  commodityType,
  species,
  numberOfAnimals,
  numberOfPackages,
  cph,
  unitRecord,
  passport,
  tattoo,
  earTag,
  horseName,
  identificationDetails,
  description,
  permanentAddress,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue
]

// Groups are obligations that other obligations reference via `within`.
export const groups = obligations.filter((o) =>
  obligations.some((other) => other.within === o)
)
