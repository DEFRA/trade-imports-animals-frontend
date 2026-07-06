/**
 * Obligations — Live Animals V4 data-field model.
 *
 * Source: Confluence "Live Animals Data Fields - V4" (page 6497338582).
 * Model under test: obligations model from EUDPA-249 spike (see
 * ../obligations/). This manifest expresses the V4 domain against that
 * model; see GAPS.md for anything the model can't express naturally.
 *
 * Modelling walk (iterations land layer by layer):
 *   1. Notification-level countryOfOrigin + regionCodeRequirement gate.
 *   2. Notification-level singles + standard address blocks:
 *      reason/purpose gate, transporter-type mutually-exclusive
 *      commercial/private address blocks, means-of-transport gate on
 *      transitedCountries, six standard address blocks storing composite
 *      values.
 *   3. Commodity line + members: user-driven indexed group with
 *      per-line commodityCode / commodityType / species /
 *      numberOfAnimals field records, numberOfPackages as a
 *      commodity-code-gated derived-leaf (see GAPS.md §1), CPH as a
 *      notification-level single reading nested storage, and
 *      animalsCertifiedFor.
 *   4. Unit record + per-animal identifiers (this iteration): nested
 *      user-driven indexed group inside commodityLine; per-unit
 *      identifiers (passport / tattoo / earTag / horseName) gated by
 *      the parent line's commodityCode via the new gatedBy substrate;
 *      identificationDetails / description inverse-gated for
 *      commodities with no specific identifier; permanentAddress as a
 *      per-unit standard address block gated by commodityCode. See
 *      GAPS.md §2 for the identity-space-mismatch gap closed by
 *      gatedBy.
 *   5. Accompanying Document all-or-nothing block.
 *
 * System-populated fields (Reference Number, gov.identity-fed Responsible
 * Person, MDM-sourced enum values) are stubbed in test fixtures rather
 * than modelled as obligations.
 *
 * Gate combinators (`allowListed`, `and`, `not`, etc.) come from
 * `gates.js`; the evaluator interprets them via `gate-resolver.js`.
 * Prefer `gatedBy` over `applyTo` for new obligations — declarative,
 * cut+paste-friendly, single-source-of-truth per gate. Step 1-3
 * obligations still use `applyTo` for now; refactor is deferred to 4c.
 *
 * Standard address block: modelled as a single-cardinality obligation
 * whose stored value is a composite `{ name, addressLine1, addressLine2?,
 * town, county?, postCode, country, telephone, email }`. Field-level
 * validation of the composite (max-length, formats, mandatory subfields)
 * is out of scope of the obligation model.
 */

import { allowListed, and, not } from './gates.js'

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

// Conditional: required when regionCodeRequirement === 'yes'. Modelled
// as always-in-scope-with-optional-status when the gate is off, so a
// previously-entered value is retained across gate flips (matches the
// V4 spec: the field itself is not purged on `no`).
export const regionCode = {
  id: 'c23d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
  name: 'regionCode',
  applyTo: (fulfilments) => {
    if (fulfilments[regionCodeRequirement.id] === 'yes') {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.regionCode.mandatory.becauseRegionCodeRequired',
            explanation:
              'regionCode is mandatory when regionCodeRequirement is yes'
          }
        ]
      }
    }
    return { inScope: true, status: 'optional' }
  }
}

// -----------------------------------------------------------------------------
// Reason for import + purpose in internal market
// -----------------------------------------------------------------------------

export const reasonForImport = {
  id: 'd34e5f6a-7b8c-4d9e-8f01-2a3b4c5d6e7f',
  name: 'reasonForImport',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Purge-on-flip is the default: when reasonForImport is not
// 'internal-market', purposeInInternalMarket goes out of scope and any
// stored value is dropped (matches V4 spec — the field is only present
// when applicable).
export const purposeInInternalMarket = {
  id: 'e45f6a7b-8c9d-4e01-8f23-4a5b6c7d8e9f',
  name: 'purposeInInternalMarket',
  applyTo: (fulfilments) => {
    if (fulfilments[reasonForImport.id] === 'internal-market') {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.purposeInInternalMarket.applicable.becauseInternalMarket',
            explanation:
              'purposeInInternalMarket applies when reasonForImport is internal-market'
          }
        ]
      }
    }
    return { inScope: false }
  }
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
// 'private' drops any stored commercialTransporter address (out-of-scope
// obligations are removed from storage by the evaluator's purge step).
export const commercialTransporter = {
  id: 'de15c6d7-e8f9-4a04-8b50-dc3d4e5f6071',
  name: 'commercialTransporter',
  applyTo: (fulfilments) => {
    if (fulfilments[transporterType.id] === 'commercial') {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.commercialTransporter.applicable.becauseCommercial',
            explanation:
              'commercialTransporter applies when transporterType is commercial'
          }
        ]
      }
    }
    return { inScope: false }
  }
}

export const privateTransporter = {
  id: 'ef26d7e8-f9a0-4b15-8c61-ed4e5f607182',
  name: 'privateTransporter',
  applyTo: (fulfilments) => {
    if (fulfilments[transporterType.id] === 'private') {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.privateTransporter.applicable.becausePrivate',
            explanation:
              'privateTransporter applies when transporterType is private'
          }
        ]
      }
    }
    return { inScope: false }
  }
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
// country strings. Out of scope (and purged) when means-of-transport is
// not railway or road-vehicle.
export const transitedCountries = {
  id: '78b9c0d1-e2f3-4a4e-8bfa-7c8d9e0f1a2b',
  name: 'transitedCountries',
  applyTo: (fulfilments) => {
    const means = fulfilments[meansOfTransport.id]
    if (means === 'railway' || means === 'road-vehicle') {
      return {
        inScope: true,
        status: 'optional',
        reasons: [
          {
            code: 'obligation.transitedCountries.applicable.becauseLandTransport',
            explanation:
              'transitedCountries applies when meansOfTransport is railway or road-vehicle'
          }
        ]
      }
    }
    return { inScope: false }
  }
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
// as unconditional field record for now; revisit if it turns out to
// need per-line gating (would be another derived-leaf case per
// GAPS.md §1).
export const commodityType = {
  id: '22071829-2a3b-4e5f-8cde-28f9a0b1c2d4',
  name: 'commodityType',
  within: commodityLine,
  status: 'mandatory'
}

// Multi-select; stored value is an array of species strings per line.
// The obligation model treats the array opaquely — agreed-maximum
// cardinality is out of scope.
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
// pattern in tests; the full list belongs with the real journey code,
// not this spike.
export const PACKAGE_COUNT_COMMODITIES = [
  '01064100', // Bees
  '01063100', // Birds of Prey — Owls / Falcons / Other
  '01061900', // Cats / Dogs / Ferrets / Rodents
  '0102' // Cattle
]

// Derived-leaf reuse — see GAPS.md §1 for the conceptual gap this
// resolves and why it's not a machinery gap.
//
// Semantics: per-line optional field record, in scope on any line whose
// commodityCode is in PACKAGE_COUNT_COMMODITIES. Record-ids are the
// line-instance ids where the code matches — NOT the commodity code
// values — because two lines can share a code and each needs an
// independent packages answer. Storage shape:
//   fulfilments[numberOfPackages.id] = { line2: 3 }
// (never `{ '01064100': 3 }` — see GAPS.md §1 for why that shape
// collapses under duplicate codes.)
//
// `controllingObligation` names the field whose values drive the
// filter, not the source of the record-ids themselves. The naming
// mismatch is the gap.
export const numberOfPackages = {
  id: '252a3b4c-5d6e-4b82-8f01-5bc2d3e4f507',
  name: 'numberOfPackages',
  within: commodityLine,
  status: 'optional',
  indexedBy: {
    source: 'derived',
    controllingObligation: commodityCode,
    mutability: 'edit-only'
  },
  applyTo: (fulfilments) => {
    const codesByLine = fulfilments[commodityCode.id] ?? {}
    const matchingLineIds = Object.entries(codesByLine)
      .filter(([, code]) => PACKAGE_COUNT_COMMODITIES.includes(code))
      .map(([lineId]) => lineId)
    if (matchingLineIds.length === 0) return { inScope: false }
    return {
      inScope: true,
      reasons: [
        {
          code: 'obligation.numberOfPackages.applicable.becausePackageCountCommodity',
          explanation:
            'numberOfPackages applies on lines whose commodityCode is in the package-count list'
        }
      ],
      records: matchingLineIds
    }
  }
}

// -----------------------------------------------------------------------------
// County Parish Holding (CPH) — notification-level single, conditional
// on the presence of any CPH-required commodity code across all
// commodity lines.
//
// Pattern note (not a gap): a notification-level single's applyTo
// reaches into the storage of a nested-record obligation
// (`commodityCode`'s per-line map) to make its decision. Awkward
// because the applyTo has to know the storage shape of another
// obligation, but no evaluator extension needed — applyTo receives the
// whole fulfilments map by design.
// -----------------------------------------------------------------------------

// Subset of the 19 CPH-required codes listed on the Confluence page.
export const CPH_REQUIRED_COMMODITIES = [
  '0102', // Cattle
  '0103', // Pig (Domestic)
  '010410', // Sheep (Domestic)
  '010420' // Goats
]

export const cph = {
  id: '263b4c5d-6e7f-4c93-8012-6cd3e4f50618',
  name: 'cph',
  applyTo: (fulfilments) => {
    const codesByLine = fulfilments[commodityCode.id] ?? {}
    const anyRequired = Object.values(codesByLine).some((code) =>
      CPH_REQUIRED_COMMODITIES.includes(code)
    )
    if (!anyRequired) return { inScope: false }
    return {
      inScope: true,
      status: 'mandatory',
      reasons: [
        {
          code: 'obligation.cph.applicable.becauseCphCommodity',
          explanation:
            'CPH applies when any commodity line has a CPH-required commodityCode'
        }
      ]
    }
  }
}

// -----------------------------------------------------------------------------
// Unit record — nested user-driven indexed group inside commodityLine.
// Composite keys have length 2: `lineId/unitId`. Instance-ids are opaque
// orchestrator-generated ULIDs — mnemonic `line1/unit1` etc. in tests.
// -----------------------------------------------------------------------------

export const unitRecord = {
  id: '385d6e7f-8091-4eb5-8234-8ef506172940',
  name: 'unitRecord',
  within: commodityLine
  // No applyTo, no gatedBy — structural user-driven group, always in
  // scope. Instance-ids inferred from descendant field-record composite-
  // key prefixes.
}

// -----------------------------------------------------------------------------
// Commodity-code whitelists driving unit-level identifier scope.
// Subsets of the full V4 lists — enough to exercise every pattern in
// tests. Full lists belong with the real journey code, not this spike.
// -----------------------------------------------------------------------------

// Commodities that require a Passport identifier.
export const PASSPORT_COMMODITIES = [
  '0101', // Horse
  '0102', // Cattle
  '01061900' // Cats / Dogs / Ferrets
]

// Commodities that require a Tattoo identifier.
export const TATTOO_COMMODITIES = [
  '01061900', // Cats / Dogs / Ferrets
  '0103', // Pig
  '0102' // Bovine
]

// Commodities that require an Ear Tag identifier.
export const EAR_TAG_COMMODITIES = [
  '0102', // Cattle
  '0103', // Pig
  '010410', // Sheep
  '010420' // Goats
]

// Commodities that require a Horse Name.
export const HORSE_NAME_COMMODITIES = ['0101']

// Commodities that require a Permanent Address per animal.
export const PERMANENT_ADDRESS_COMMODITIES = ['01061900']

// -----------------------------------------------------------------------------
// Per-unit identifier field records — depth-2, commodity-gated via
// gatedBy. Each obligation is one data structure with a declarative
// gate — no boilerplate enumeration logic; the resolver handles the
// depth-2 identity-space expansion. See GAPS.md §2.
// -----------------------------------------------------------------------------

export const passport = {
  id: '39657a80-91a2-4fc6-8345-9f0617284a51',
  name: 'passport',
  within: unitRecord,
  status: 'optional',
  gatedBy: allowListed(commodityCode, PASSPORT_COMMODITIES)
}

export const tattoo = {
  id: '3a768b91-a2b3-4fd7-8456-a01728395b62',
  name: 'tattoo',
  within: unitRecord,
  status: 'optional',
  gatedBy: allowListed(commodityCode, TATTOO_COMMODITIES)
}

export const earTag = {
  id: '3b879ca2-b3c4-4fe8-8567-a1283a4a6c73',
  name: 'earTag',
  within: unitRecord,
  status: 'optional',
  gatedBy: allowListed(commodityCode, EAR_TAG_COMMODITIES)
}

export const horseName = {
  id: '3c98adb3-c4d5-4ff9-8678-a2394b5b7d84',
  name: 'horseName',
  within: unitRecord,
  status: 'optional',
  gatedBy: allowListed(commodityCode, HORSE_NAME_COMMODITIES)
}

// Inverse gate: in scope for units on commodity lines whose code has
// NO specific identifier type. The `and(not(...), ...)` shape reads
// as "no specific identifier applies."
export const identificationDetails = {
  id: '3da9bec4-d5e6-4a0a-8789-a34a5c6c8e95',
  name: 'identificationDetails',
  within: unitRecord,
  status: 'optional',
  gatedBy: and(
    not(allowListed(commodityCode, PASSPORT_COMMODITIES)),
    not(allowListed(commodityCode, TATTOO_COMMODITIES)),
    not(allowListed(commodityCode, EAR_TAG_COMMODITIES)),
    not(allowListed(commodityCode, HORSE_NAME_COMMODITIES))
  )
}

export const description = {
  id: '3ebacfd5-e6f7-4b1b-889a-a45b6d7d9fa6',
  name: 'description',
  within: unitRecord,
  status: 'optional',
  gatedBy: and(
    not(allowListed(commodityCode, PASSPORT_COMMODITIES)),
    not(allowListed(commodityCode, TATTOO_COMMODITIES)),
    not(allowListed(commodityCode, EAR_TAG_COMMODITIES)),
    not(allowListed(commodityCode, HORSE_NAME_COMMODITIES))
  )
}

// -----------------------------------------------------------------------------
// Permanent address — depth-2 standard address block, commodity-gated.
// Stored composite address value per unit-instance-path.
// -----------------------------------------------------------------------------

export const permanentAddress = {
  id: '3fcbd0e6-f708-4c2c-89ab-a56c7e8ea0b7',
  name: 'permanentAddress',
  within: unitRecord,
  status: 'mandatory',
  gatedBy: allowListed(commodityCode, PERMANENT_ADDRESS_COMMODITIES)
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
  permanentAddress
]

// Groups are obligations that other obligations reference via `within`.
export const groups = obligations.filter((o) =>
  obligations.some((other) => other.within === o)
)
