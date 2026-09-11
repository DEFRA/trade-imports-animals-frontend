import {
  earTagCommodities,
  horseNameCommodities,
  identifiedCommodities,
  microchipCommodities,
  passportCommodities,
  permanentAddressCommodities,
  tattooCommodities
} from '../../../services/commodities/index.js'
import {
  allowListed,
  moreThanOne
} from '../../../../../model/obligations/helpers/index.js'
import { commodityCode, commodityLine } from './lines.js'

const microchipReason = {
  code: 'obligation.microchip.applicable.becauseMicrochipCommodity',
  explanation:
    'microchip applies on units of lines whose commodityCode is in the microchip list'
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
  // must carry ≥ 1 of the five identifier obligations. Listed as
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
  // Every listed identifier is commodity-gated, so on a line whose
  // commodity carries none of them the rule has nothing it could
  // ask for. It is vacuous there rather than unsatisfiable:
  // `checkAnyOfIds` skips an instance no listed leaf is in scope
  // for, and the empty-collection floor the bridge derives from
  // this key does the same (bridge/status/completeness/invariants.js).
  // Design release 1 asks for identification only where the
  // commodity has an identifier of its own; such a line gets no
  // unit records and none are demanded of it.
  //
  // How MANY animals must be identified before the notification can be
  // submitted. Design release 1's own rule is "Animal identifiers are
  // optional unless multiple species are selected, in which case at
  // least one identifier is required per species" — so a consignment
  // carrying one identified species can be submitted with no identifier
  // saved at all, and one carrying several is asked for one complete
  // record per species, never one per animal.
  //
  // `requires.floorAppliesToParent` carries that condition. It narrows
  // the empty-collection floor the bridge derives from `anyOfIds`
  // (bridge/status/completeness/invariants.js) to the lines of a
  // multi-species consignment: `moreThanOne` stands the whole floor down
  // unless more than one line carries a commodity with an identifier set
  // of its own.
  //
  // The number of animals a line declares is still shown as progress on
  // the identification page and on Check your answers; it no longer
  // gates the submission.
  requires: {
    anyOfIds: [
      '8f030bfa-0734-40c8-9d9e-b9e95dac4724', // microchip
      '39657a80-91a2-4fc6-8345-9f0617284a51', // passport
      '3a768b91-a2b3-4fd7-8456-a01728395b62', // tattoo
      '3b879ca2-b3c4-4fe8-8567-a1283a4a6c73', // earTag
      '3c98adb3-c4d5-4ff9-8678-a2394b5b7d84' // horseName
    ],
    errorCode: 'obligation.unitRecord.identifiersRequired',
    floorAppliesToParent: moreThanOne(
      allowListed(commodityCode, identifiedCommodities, null)
    )
  }
}

// -----------------------------------------------------------------------------
// Per-unit identifier field records — depth-2, commodity-gated via
// `allowListed` with projection to unitRecord's instance-paths.
// The evaluator's pre-purge enumeration supplies the paths; the
// obligation code doesn't enumerate them itself. Allowlists come from
// the commodities service in the stored picker-name vocabulary.
// -----------------------------------------------------------------------------

export const microchip = {
  id: '8f030bfa-0734-40c8-9d9e-b9e95dac4724',
  name: 'animalIdentifierMicrochip',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, microchipCommodities, unitRecord, [
    microchipReason
  ])
}

export const passport = {
  id: '39657a80-91a2-4fc6-8345-9f0617284a51',
  name: 'animalIdentifierPassport',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, passportCommodities, unitRecord, [
    passportReason
  ])
  // Note: `unitRecord` is a structural gatedParentGroup (the closure's
  // 3rd arg), not a value read. Only the gate obligation
  // (`commodityCode.id`) is a dependency — gatedParentGroups are
  // structural and are not part of the reachability dependency graph.
}

export const tattoo = {
  id: '3a768b91-a2b3-4fd7-8456-a01728395b62',
  name: 'animalIdentifierTattoo',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, tattooCommodities, unitRecord, [
    tattooReason
  ])
}

export const earTag = {
  id: '3b879ca2-b3c4-4fe8-8567-a1283a4a6c73',
  name: 'animalIdentifierEarTag',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, earTagCommodities, unitRecord, [
    earTagReason
  ])
}

export const horseName = {
  id: '3c98adb3-c4d5-4ff9-8678-a2394b5b7d84',
  name: 'horseName',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, horseNameCommodities, unitRecord, [
    horseNameReason
  ])
}

// A commodity on none of the identifier allowlists is asked for no
// identifier at all. There is no free-text fallback: design release 1
// asks for identification only where the commodity has an identifier
// type of its own, so an unlisted commodity — ornamental fish, say —
// carries no identifier obligation and gets no panel on the
// identification page.

export const permanentAddress = {
  id: '3fcbd0e6-f708-4c2c-89ab-a56c7e8ea0b7',
  name: 'permanentAddress',
  within: unitRecord,
  status: 'mandatory',
  applyTo: allowListed(commodityCode, permanentAddressCommodities, unitRecord, [
    permanentAddressReason
  ])
}
