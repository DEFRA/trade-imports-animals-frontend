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
 * `allowListed`, `notInUnionOf`, `anyAllowListed`, `matches`,
 * `equalsGate`, `presentGate`, `includesGate`, `alwaysInScope` (and
 * `branchedGate` as an escape hatch for genuinely opaque predicates,
 * unused on the manifest today) — that build applyTo functions with
 * metadata attached for optional introspection. One mechanism, one
 * testing story: any obligation's applyTo can be exercised as a plain
 * function call with plain inputs (no evaluator, no resolver, no
 * obligationsById).
 *
 * Helper choice convention:
 *   - `equals`-shape non-total gates → `equalsGate(gate, value, whenTrue, whenFalse)`
 *   - `equals`-shape status-flip (both branches in-scope) → same helper,
 *     both branches with `inScope: true` and different `status`
 *   - `includes`-shape gates → `includesGate(gate, values, whenTrue, whenFalse)`
 *   - `isFilled`-shape gates → `presentGate(gate, whenTrue, whenFalse)`
 * Prefer these over `branchedGate` — the meta-first helpers co-declare
 * the closure body, the metadata sidecar and the dependency graph as a
 * single value, so renaming a gate obligation touches one call site.
 *
 * Dependency declaration: gated obligations may carry an explicit
 * `dependsOn: string[]` schema key OR let it be DERIVED from the applyTo
 * helper's metadata. Meta-first helpers all name their gate obligation
 * on `.metadata.obligation`, so `obligationMetadata()` recovers the
 * dependency graph without duplication. Closures are opaque to a
 * reachability prover; the derived-or-declared `dependsOn` makes the
 * graph explicit data alongside the closure, and the coverage assertion
 * accepts either path.
 *
 * System-populated fields are declared but NOT presented in the flow
 * layer:
 *   - `poApprovedReferenceNumber` — system-minted at notification
 *     creation time. Format `GBN-AG-YY-XXXXXX` (Crockford base32 body).
 *   - `responsiblePersonForLoad` — consumed from gov.identity on
 *     authentication. Composite (person + telephone + email + org name
 *     + org address + org telephone).
 * Both are listed on the V4 spec so the manifest reflects them. Their
 * value legality is enforced upstream (the system that mints the id;
 * gov.identity for the person), so neither carries a domain entry;
 * both are on the `KNOWN_UNWIRED` allow-list in `coverage.test.js`
 * with a reason.
 *
 * MDM-sourced enum values (commodities / species / ports of
 * entry / country of origin / animals-certified-for options) are
 * stubbed in test fixtures rather than modelled as obligations —
 * their real option lists come from MDM in production.
 *
 * Standard address block: modelled as a single-cardinality obligation
 * whose stored value is a composite `{ name, addressLine1,
 * addressLine2?, town, county?, postCode, country, telephone, email }`.
 * Field-level validation of the composite (max-length, formats,
 * mandatory subfields) is out of scope of the obligation model.
 */

import {
  allowListed,
  anyAllowListed,
  equalsGate,
  includesGate,
  notInUnionOf
} from './helpers.js'
import {
  cphCommodities,
  earTagCommodities,
  horseNameCommodities,
  packageCountCommodities,
  passportCommodities,
  permanentAddressCommodities,
  tattooCommodities,
  unweanedCommodities
} from '../../services/commodities/index.js'

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
    'purposeInInternalMarket applies when reasonForImport is internalMarket'
}

const destinationCountryReason = {
  code: 'obligation.destinationCountry.applicable.becauseTransitOrTranshipment',
  explanation:
    'destinationCountry applies when reasonForImport is transit or transhipmentOrOnwardTravel'
}

const portOfExitReason = {
  code: 'obligation.portOfExit.applicable.becauseTransitOrTemporaryAdmissionHorses',
  explanation:
    'portOfExit applies when reasonForImport is transit or temporaryAdmissionHorses'
}

const exitDateReason = {
  code: 'obligation.exitDate.applicable.becauseTemporaryAdmissionHorses',
  explanation:
    'exitDate applies when reasonForImport is temporaryAdmissionHorses'
}

const commercialTransporterReason = {
  code: 'obligation.commercialTransporter.applicable.becauseCommercial',
  explanation:
    'commercialTransporter applies when transporterType is Commercial'
}

const privateTransporterReason = {
  code: 'obligation.privateTransporter.applicable.becausePrivate',
  explanation: 'privateTransporter applies when transporterType is Private'
}

const transitedCountriesReason = {
  code: 'obligation.transitedCountries.applicable.becauseLandTransport',
  explanation:
    'transitedCountries applies when meansOfTransport is RAILWAY or ROAD_VEHICLE'
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

// -----------------------------------------------------------------------------
// System-populated fields — declared for V4 completeness but NOT
// presented in the flow layer. Value legality is enforced upstream
// (system minting for the reference number; gov.identity for the
// responsible person), so both are on `KNOWN_UNWIRED` in
// obligations/coverage.test.js. Added during step 5c spec pass.
// -----------------------------------------------------------------------------

// V4: `GBN-AG-YY-XXXXXX` where XXXXXX is a 6-char Crockford base32
// body (`0-9A-HJKMNP-TV-Z`, no I/L/O/U). System-assigned at
// notification-creation time; never user-entered.
export const poApprovedReferenceNumber = {
  id: '9a0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d',
  name: 'poApprovedReferenceNumber',
  status: 'mandatory'
}

// V4: Consumed from gov.identity on authentication. Composite:
// { person, telephone, email, orgName, orgAddress, orgTelephone }.
// gov.identity guarantees the shape upstream so the spike does not
// enforce a domain-level predicate.
export const responsiblePersonForLoad = {
  id: 'ab0c1d2e-3f4a-4b5c-8d6e-7f8a9b0c1d2e',
  name: 'responsiblePersonForLoad',
  status: 'mandatory'
}

// -----------------------------------------------------------------------------
// Country of origin + regionCode conditional gate
// -----------------------------------------------------------------------------

export const countryOfOrigin = {
  id: 'a01b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  name: 'countryOfOrigin',
  status: 'mandatory'
}

export const regionCodeRequirement = {
  id: 'b12c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
  name: 'regionOfOriginCodeRequirement',
  status: 'mandatory'
}

// Retain-value pattern: always in scope; mandatory when the
// requirement is 'yes', optional otherwise. Stored values are kept
// across gate flips (V4 spec: the field itself is not purged on 'no').
export const regionCode = {
  id: 'c23d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
  name: 'regionOfOriginCode',
  applyTo: equalsGate(
    regionCodeRequirement,
    'yes',
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
  status: 'mandatory'
}

// Purge-on-flip: when reasonForImport is not 'internalMarket',
// purposeInInternalMarket goes out of scope and any stored value is
// dropped.
export const purposeInInternalMarket = {
  id: 'e45f6a7b-8c9d-4e01-8f23-4a5b6c7d8e9f',
  name: 'purposeInInternalMarket',
  applyTo: equalsGate(
    reasonForImport,
    'internalMarket',
    {
      inScope: true,
      status: 'mandatory',
      reasons: [purposeInInternalMarketReason]
    },
    { inScope: false }
  )
}

// V4 (Confluence page 6497338582, "Reason of Import" section):
// destinationCountry applies when reasonForImport ∈ { transit,
// transhipmentOrOnwardTravel }. Purge-on-flip.
const DESTINATION_COUNTRY_APPLICABLE_REASONS = [
  'transit',
  'transhipmentOrOnwardTravel'
]

export const destinationCountry = {
  id: 'f56a7b8c-9d0e-4f12-8034-5b6c7d8e9f01',
  name: 'destinationCountry',
  applyTo: includesGate(
    reasonForImport,
    DESTINATION_COUNTRY_APPLICABLE_REASONS,
    {
      inScope: true,
      status: 'mandatory',
      reasons: [destinationCountryReason]
    },
    { inScope: false }
  )
}

// V4: portOfExit applies when reasonForImport ∈ { transit,
// temporaryAdmissionHorses }. Spec: "Port selected from the port of
// entry list (Exit and Entry share the same list)." Purge-on-flip.
const PORT_OF_EXIT_APPLICABLE_REASONS = ['transit', 'temporaryAdmissionHorses']

export const portOfExit = {
  id: 'a67b8c9d-0e1f-4023-8145-6c7d8e9f0112',
  name: 'portOfExit',
  applyTo: includesGate(
    reasonForImport,
    PORT_OF_EXIT_APPLICABLE_REASONS,
    {
      inScope: true,
      status: 'mandatory',
      reasons: [portOfExitReason]
    },
    { inScope: false }
  )
}

// V4: exitDate applies only when reasonForImport is
// temporaryAdmissionHorses. Purge-on-flip.
export const exitDate = {
  id: 'b78c9d0e-1f20-4134-8256-7d8e9f012023',
  name: 'exitDate',
  applyTo: equalsGate(
    reasonForImport,
    'temporaryAdmissionHorses',
    {
      inScope: true,
      status: 'mandatory',
      reasons: [exitDateReason]
    },
    { inScope: false }
  )
}

// -----------------------------------------------------------------------------
// Contains unweaned animals — declared LATER (after commodityCode)
// because its applyTo captures commodityCode. See below the CPH
// declaration.

// -----------------------------------------------------------------------------
// Standard address blocks — always in scope. Composite value stored
// directly on the obligation id.
// -----------------------------------------------------------------------------

export const placeOfOrigin = {
  id: '89c0d1e2-f3a4-4b5f-8c0b-8d9e0f1a2b3c',
  name: 'placeOfOrigin',
  status: 'mandatory'
}

export const consignor = {
  id: '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d',
  name: 'consignor',
  status: 'mandatory'
}

export const consignee = {
  id: 'abe2f3a4-b5c6-4d71-8e2d-af0a1b2c3d4e',
  name: 'consignee',
  status: 'mandatory'
}

export const importer = {
  id: 'bcf3a4b5-c6d7-4e82-8f3e-ba1b2c3d4e5f',
  name: 'importer',
  status: 'mandatory'
}

export const placeOfDestination = {
  id: 'cd04b5c6-d7e8-4f93-8a4f-cb2c3d4e5f60',
  name: 'placeOfDestination',
  status: 'mandatory'
}

// -----------------------------------------------------------------------------
// Transporter type + mutually-exclusive address blocks
// -----------------------------------------------------------------------------

export const transporterType = {
  id: '34d5e6f7-a8b9-4c0a-8dbc-3e4f5a6b7c8d',
  name: 'transporterType',
  status: 'mandatory'
}

// Purge-on-flip: switching transporterType from 'Commercial' to
// 'Private' drops any stored commercialTransporter address.
export const commercialTransporter = {
  id: 'de15c6d7-e8f9-4a04-8b50-dc3d4e5f6071',
  name: 'commercialTransporter',
  applyTo: equalsGate(
    transporterType,
    'Commercial',
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
  applyTo: equalsGate(
    transporterType,
    'Private',
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
  status: 'mandatory'
}

export const transportIdentification = {
  id: '56f7a8b9-c0d1-4e2c-8fde-5a6b7c8d9e0f',
  name: 'transportIdentification',
  status: 'mandatory'
}

export const transportDocumentReference = {
  id: '67a8b9c0-d1e2-4f3d-8aef-6b7c8d9e0f1a',
  name: 'transportDocumentReference',
  status: 'mandatory'
}

// Conditional in-scope-optional multi-select — stored as an array of
// country strings. Out of scope (and purged) when means-of-transport
// is not RAILWAY or ROAD_VEHICLE.
const LAND_TRANSPORT_MODES = ['RAILWAY', 'ROAD_VEHICLE']

export const transitedCountries = {
  id: '78b9c0d1-e2f3-4a4e-8bfa-7c8d9e0f1a2b',
  name: 'transitedCountries',
  applyTo: includesGate(
    meansOfTransport,
    LAND_TRANSPORT_MODES,
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
  status: 'mandatory'
}

export const portOfEntry = {
  id: '23c4d5e6-f7a8-4b09-8cab-2d3e4f5a6b7c',
  name: 'portOfEntry',
  status: 'mandatory'
}

// -----------------------------------------------------------------------------
// Contact address (user-entered variant — gov.identity variant stubbed
// as pre-filled fulfilment per Q4)
// -----------------------------------------------------------------------------

export const contactAddress = {
  id: 'f037e8f9-a0b1-4c26-8d72-fe5f60718293',
  name: 'contactAddress',
  status: 'mandatory'
}

// -----------------------------------------------------------------------------
// Internal reference (trader-entered)
// -----------------------------------------------------------------------------

export const internalReferenceNumber = {
  id: '10e5f607-1829-4a3b-84c5-06d7e8f9a0b1',
  name: 'internalReferenceNumber',
  status: 'optional'
}

// -----------------------------------------------------------------------------
// Animals certified for (notification-level; spec notes APHA may make
// this commodity-gated later — modelled as always-mandatory for now)
// -----------------------------------------------------------------------------

export const animalsCertifiedFor = {
  id: '274c5d6e-7f80-4da4-8123-7de4f5061729',
  name: 'animalsCertifiedFor',
  status: 'mandatory'
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
  name: 'commodityLines',
  // No applyTo — structural group, always in scope. Instance ids
  // inferred from field-record composite-key prefixes.
  //
  // Collection floor: V4 requires at least one commodity line on
  // every consignment. Without this floor a zero-line session is
  // vacuously satisfied — see state-queries.js
  // `groupInvariantErrors`.
  requires: {
    minEntries: 1,
    errorCode: 'obligation.commodityLine.atLeastOne'
  }
}

export const commodityCode = {
  id: '21f60718-192a-4d4e-8bcd-17e8f9a0b1c3',
  name: 'commoditySelection',
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
  name: 'speciesSelection',
  within: commodityLine,
  status: 'mandatory'
}

export const numberOfAnimals = {
  id: '24192a3b-4c5d-4a71-8ef0-4ab1c2d3e4f6',
  name: 'numberOfAnimalsQuantity',
  within: commodityLine,
  status: 'mandatory'
}

// Depth-1 commodity-gated field record. `applyTo` returns records
// = matching line-ids; no projection group needed (the gate lives at
// the same identity level as the gated obligation). Uses `allowListed`
// with `null` projection (NOT `includesGate`) — see helpers.js
// taxonomy: the gate `commodityCode` is `within: commodityLine`, so
// `fulfilments[commodityCode.id]` is a records-map, not a scalar.
// The allowlist is the service's package-count list; only entries that
// are picker names can ever match a stored selection.
export const numberOfPackages = {
  id: '252a3b4c-5d6e-4b82-8f01-5bc2d3e4f507',
  name: 'numberOfPackages',
  within: commodityLine,
  status: 'optional',
  applyTo: allowListed(commodityCode, packageCountCommodities(), null, [
    numberOfPackagesReason
  ])
}

// -----------------------------------------------------------------------------
// CPH — notification-level single, aggregated across commodity lines.
// -----------------------------------------------------------------------------

export const cph = {
  id: '263b4c5d-6e7f-4c93-8012-6cd3e4f50618',
  name: 'countyParishHoldingCph',
  applyTo: anyAllowListed(
    commodityCode,
    cphCommodities(),
    { inScope: true, status: 'mandatory', reasons: [cphReason] },
    { inScope: false }
  )
}

// -----------------------------------------------------------------------------
// Contains unweaned animals — notification-level yes/no, gated on the
// active commodities per V4. Only mandatory when the
// consignment includes at least one commodity requiring unweaned
// tracking (equines / cattle / pigs / sheep / goats). Declared here
// (rather than up top with
// the other notification-level scalar obligations) because the
// applyTo closure captures `commodityCode` — declaring it before
// commodityCode would trip the temporal dead zone.
// -----------------------------------------------------------------------------

const unweanedApplicableReason = {
  code: 'obligation.containsUnweanedAnimals.mandatory.becauseApplicableCommodity',
  explanation:
    'consignment includes at least one commodity that requires unweaned-animal tracking (equines, cattle, pigs, sheep, or goats)'
}

export const containsUnweanedAnimals = {
  id: '01a2b3c4-d5e6-4f07-8a89-0b1c2d3e4f5a',
  name: 'containsUnweanedAnimals',
  applyTo: anyAllowListed(
    commodityCode,
    unweanedCommodities(),
    { inScope: true, status: 'mandatory', reasons: [unweanedApplicableReason] },
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
  name: 'animalIdentifiers',
  within: commodityLine,
  // No applyTo — structural user-driven group, always in scope.
  //
  // V4 spec (Confluence page 6497338582): "Field Block - Mandatory
  // to Submit - At least one Animal Identifier". Every unit-record
  // must carry ≥ 1 of the six identifier obligations. Listed as
  // literal ids in `requires.anyOfIds` rather than obligation
  // references — id-based deferred resolution avoids
  // declaration-order coupling and makes the "requires-any-of" edge
  // legible as data to the reachability prover.
  //
  // `groupInvariantErrors` (state-queries.js) walks in-scope
  // instances and emits one error per instance that violates the
  // invariant, so the per-unit-records subsection stays In progress
  // until the user fixes it.
  //
  // V4 spec cross-check ("unit records ARE animals" reading of
  // Confluence page 6497338582): the count of unit-record instances
  // on a given commodity line must equal `numberOfAnimals` on that
  // line. Modelled as `requires.recordCountEquals` — a per-parent-
  // instance count check that fires one error per mismatched line.
  // Rollup-only: neither the number field nor the unit records are
  // purged when the other changes — the user resolves the mismatch
  // by adding / removing units or amending the number.
  requires: {
    anyOfIds: [
      '39657a80-91a2-4fc6-8345-9f0617284a51', // passport
      '3a768b91-a2b3-4fd7-8456-a01728395b62', // tattoo
      '3b879ca2-b3c4-4fe8-8567-a1283a4a6c73', // earTag
      '3c98adb3-c4d5-4ff9-8678-a2394b5b7d84', // horseName
      '3da9bec4-d5e6-4a0a-8789-a34a5c6c8e95', // identificationDetails
      '3ebacfd5-e6f7-4b1b-889a-a45b6d7d9fa6' // description
    ],
    errorCode: 'obligation.unitRecord.identifiersRequired',
    recordCountEquals: {
      fieldId: numberOfAnimals.id,
      errorCode: 'obligation.unitRecord.countMustMatchNumberOfAnimals'
    }
  }
}

// -----------------------------------------------------------------------------
// Per-unit identifier field records — depth-2, commodity-gated via
// `allowListed` with projection to unitRecord's instance-paths.
// The evaluator's pre-purge enumeration supplies the paths; the
// obligation code doesn't enumerate them itself. Allowlists come from
// the commodities service in the stored picker-name vocabulary.
// -----------------------------------------------------------------------------

export const passport = {
  id: '39657a80-91a2-4fc6-8345-9f0617284a51',
  name: 'animalIdentifierPassport',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, passportCommodities(), unitRecord, [
    passportReason
  ])
  // Note: `unitRecord` is a structural projection group (the closure's
  // 3rd arg), not a value read. Only the gate obligation
  // (`commodityCode.id`) is a dependency — projection groups are
  // structural and are not part of the reachability dependency graph.
}

export const tattoo = {
  id: '3a768b91-a2b3-4fd7-8456-a01728395b62',
  name: 'animalIdentifierTattoo',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, tattooCommodities(), unitRecord, [
    tattooReason
  ])
}

export const earTag = {
  id: '3b879ca2-b3c4-4fe8-8567-a1283a4a6c73',
  name: 'animalIdentifierEarTag',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, earTagCommodities(), unitRecord, [
    earTagReason
  ])
}

export const horseName = {
  id: '3c98adb3-c4d5-4ff9-8678-a2394b5b7d84',
  name: 'horseName',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, horseNameCommodities(), unitRecord, [
    horseNameReason
  ])
}

// Inverse gate — the free-text identifiers apply on units whose parent
// line's commodity has NO specific identifier. Expressed as
// `notInUnionOf` over the four specific-identifier whitelists.
// The derived union lives on `.metadata.values`
// so the reachability prover can synthesise a witness value (any code
// not in the union) and the browser-side controllers can inspect
// admissibility without executing the closure. Adding a fifth typed
// identifier means adding its list to the array here — the derived
// union widens automatically. Hand-restated four-conjunct complements
// would silently double-gate on such an addition.
const SPECIFIC_IDENTIFIER_WHITELISTS = [
  passportCommodities(),
  tattooCommodities(),
  earTagCommodities(),
  horseNameCommodities()
]

export const identificationDetails = {
  id: '3da9bec4-d5e6-4a0a-8789-a34a5c6c8e95',
  name: 'animalIdentifierIdentificationDetails',
  within: unitRecord,
  status: 'optional',
  applyTo: notInUnionOf(
    commodityCode,
    SPECIFIC_IDENTIFIER_WHITELISTS,
    unitRecord,
    [identificationDetailsReason]
  )
}

export const description = {
  id: '3ebacfd5-e6f7-4b1b-889a-a45b6d7d9fa6',
  name: 'animalIdentifierDescription',
  within: unitRecord,
  status: 'optional',
  applyTo: notInUnionOf(
    commodityCode,
    SPECIFIC_IDENTIFIER_WHITELISTS,
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
    permanentAddressCommodities(),
    unitRecord,
    [permanentAddressReason]
  )
}

// -----------------------------------------------------------------------------
// Accompanying Documents — user-driven indexed group (0..10 documents
// per notification).
//
// Spec source: traders can attach between 0 and 10 accompanying
// documents to a notification; each document carries its own type /
// attachment / reference / date-of-issue. Confluence page 6497338582
// still reads as if there is at most one document — the model is the
// source of truth until the page is amended.
//
// Per-document mandatoriness is expressed at the field level
// (`status: 'mandatory'` within the group). `requires.maxEntries: 10`
// caps the collection; the documents feature also caps the Add
// affordance but the invariant is authoritative for after-the-fact
// defence (e.g. a redeploy lowering the cap after the user saved
// records over the new limit).
// -----------------------------------------------------------------------------

export const documents = {
  id: '52210b3b-4c53-4b81-8ef0-fa0b1223e40c',
  name: 'documents',
  // No applyTo — top-level user-driven indexed group, always in scope.
  // Instance ids are session-scoped counter values (`doc1`, `doc2`, …).
  requires: {
    maxEntries: 10,
    maxEntriesErrorCode: 'obligation.accompanyingDocument.tooMany'
  }
}

export const accompanyingDocumentType = {
  id: '4fdce1f7-0819-4d3d-8abc-b67d8f9fa0c8',
  name: 'accompanyingDocumentType',
  within: documents,
  status: 'mandatory'
}

export const accompanyingDocumentAttachmentType = {
  id: '50ede208-1920-4e4e-8bcd-c78e9f0fb1d9',
  name: 'accompanyingDocumentAttachmentType',
  within: documents,
  status: 'mandatory'
}

export const accompanyingDocumentReference = {
  id: '51fef319-2a31-4f5f-8cde-d89fa010c2ea',
  name: 'accompanyingDocumentReference',
  within: documents,
  status: 'mandatory'
}

export const accompanyingDocumentDateOfIssue = {
  id: '5210042a-3b42-4a70-8def-e9a0b121d3fb',
  name: 'accompanyingDocumentDateOfIssue',
  within: documents,
  status: 'mandatory'
}

// -----------------------------------------------------------------------------
// Manifest — order does not affect evaluation (evaluator builds group
// hierarchy via `within` back-references).
// -----------------------------------------------------------------------------

export const obligations = [
  poApprovedReferenceNumber,
  responsiblePersonForLoad,
  countryOfOrigin,
  regionCodeRequirement,
  regionCode,
  reasonForImport,
  purposeInInternalMarket,
  destinationCountry,
  portOfExit,
  exitDate,
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
  documents,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue
]

// Groups are obligations that other obligations reference via `within`.
export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

// -----------------------------------------------------------------------------
// Container back-refs — populate `member.containers` for every scalar
// obligation that participates in a `requires.allOrNothingOfIds`
// invariant carrier. The current manifest has zero `allOrNothingOfIds`
// carriers; the loop is retained as a general primitive for any future
// notification-level scalar invariant block. Idempotent — repeated
// imports rebuild the same list.
// -----------------------------------------------------------------------------
for (const container of obligations) {
  if (!container?.requires?.allOrNothingOfIds) continue
  for (const memberId of container.requires.allOrNothingOfIds) {
    const member = obligations.find((candidate) => candidate.id === memberId)
    if (!member) continue
    const existing = member.containers ?? []
    if (
      existing.some(
        (existingContainer) => existingContainer.id === container.id
      )
    ) {
      continue
    }
    // Deliberate exception to the no-in-place-mutation style rule: the
    // back-ref must land on the SAME obligation object instance already
    // referenced elsewhere in the manifest (`within` etc.), so a
    // copy-and-replace here would silently break that shared identity.
    member.containers = existing.concat(container)
  }
}
