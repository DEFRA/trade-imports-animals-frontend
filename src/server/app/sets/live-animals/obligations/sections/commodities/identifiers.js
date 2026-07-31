import {
  earTagCommodities,
  horseNameCommodities,
  passportCommodities,
  permanentAddressCommodities,
  tattooCommodities
} from '../../../../../services/commodities/index.js'
import {
  allowListed,
  notInUnionOf
} from '../../../../../model/obligations/helpers/index.js'
import { commodityCode, commodityLine, numberOfAnimals } from './lines.js'

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
