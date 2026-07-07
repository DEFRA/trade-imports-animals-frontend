/**
 * Prototype — the same V4 domain slice expressed via `applyTo` +
 * helpers, for side-by-side comparison with the `gatedBy` version in
 * `obligations.js`.
 *
 * Scope: the depth-2 identifier obligations (passport / tattoo /
 * earTag / horseName / identificationDetails / description /
 * permanentAddress) plus the step-5 accompanying document all-or-
 * nothing block. These are the hardest patterns for either mechanism
 * to express, so comparing shapes here is the most informative
 * reading.
 *
 * This file is NOT loaded as an alternative manifest — it is a
 * READING SAMPLE. UUIDs are distinct from the `gatedBy` versions so
 * that if we later go option 4 (three parallel manifests) it can
 * become a real runnable manifest alongside `obligations.js`.
 *
 * Reference obligations (`commodityCode`, `unitRecord`) and the
 * commodity-code whitelists are imported from `obligations.js` — this
 * file focuses on the gated obligations, not the domain definitions
 * they gate on.
 *
 * Design contract of `applyTo` under this prototype:
 *   `applyTo(fulfilments, fulfilmentIdsByObligationId) → decision`
 * where `fulfilmentIdsByObligationId` is a `Map<obligationId, string[]>`
 * exposing current instance-paths per obligation (in particular per
 * group). This is the map the evaluator already builds internally via
 * `enumerateGroupFulfilmentIds`; the prototype extends its signature
 * to hand it to `applyTo` too.
 */

import {
  commodityCode,
  unitRecord,
  PASSPORT_COMMODITIES,
  TATTOO_COMMODITIES,
  EAR_TAG_COMMODITIES,
  HORSE_NAME_COMMODITIES,
  PERMANENT_ADDRESS_COMMODITIES
} from './obligations.js'
import { allowListed, allowListedByPredicate, branchedGate } from './helpers.js'

// -----------------------------------------------------------------------------
// Depth-2 per-unit identifier field records — commodity-code-gated.
// Same 3-line-declaration shape as `gatedBy`; the helper hides the
// depth-2 projection (via the `fulfilmentIdsByObligationId` map).
// -----------------------------------------------------------------------------

export const passport = {
  id: '60000001-0000-4000-8000-000000000001',
  name: 'passport',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, PASSPORT_COMMODITIES, unitRecord)
}

export const tattoo = {
  id: '60000002-0000-4000-8000-000000000002',
  name: 'tattoo',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, TATTOO_COMMODITIES, unitRecord)
}

export const earTag = {
  id: '60000003-0000-4000-8000-000000000003',
  name: 'earTag',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, EAR_TAG_COMMODITIES, unitRecord)
}

export const horseName = {
  id: '60000004-0000-4000-8000-000000000004',
  name: 'horseName',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, HORSE_NAME_COMMODITIES, unitRecord)
}

// -----------------------------------------------------------------------------
// Inverse gate — the free-text identifiers apply on units whose parent
// line's commodity has NO specific identifier. Expressed as a plain JS
// predicate rather than a chain of `not(allowListed(...))` combinators.
// -----------------------------------------------------------------------------

const noSpecificIdentifier = (code) =>
  !PASSPORT_COMMODITIES.includes(code) &&
  !TATTOO_COMMODITIES.includes(code) &&
  !EAR_TAG_COMMODITIES.includes(code) &&
  !HORSE_NAME_COMMODITIES.includes(code)

export const identificationDetails = {
  id: '60000005-0000-4000-8000-000000000005',
  name: 'identificationDetails',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListedByPredicate(
    commodityCode,
    noSpecificIdentifier,
    unitRecord
  )
}

export const description = {
  id: '60000006-0000-4000-8000-000000000006',
  name: 'description',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListedByPredicate(
    commodityCode,
    noSpecificIdentifier,
    unitRecord
  )
}

// -----------------------------------------------------------------------------
// Depth-2 standard address block, commodity-gated for cats/dogs/ferrets.
// -----------------------------------------------------------------------------

export const permanentAddress = {
  id: '60000007-0000-4000-8000-000000000007',
  name: 'permanentAddress',
  within: unitRecord,
  status: 'mandatory',
  applyTo: allowListed(commodityCode, PERMANENT_ADDRESS_COMMODITIES, unitRecord)
}

// -----------------------------------------------------------------------------
// Accompanying Documents — notification-level all-or-nothing block.
//
// Contrast with the `gatedBy` version, which needed an attach-after-
// declaration convention because inline `present(sibling)` at
// declaration time would TDZ-cycle. Here the predicate is a closure
// over `const` bindings; sibling refs are resolved at call time (well
// after declarations are complete), so no cycle, no mutation, each
// obligation is self-contained.
// -----------------------------------------------------------------------------

const documentBlockMandatoryReason = {
  code: 'obligation.accompanyingDocument.mandatory.becauseAnyFieldPresent',
  explanation:
    'accompanying document fields become mandatory once any one is filled'
}

const anyDocFieldPresent = (fulfilments) =>
  [
    accompanyingDocumentType,
    accompanyingDocumentAttachmentType,
    accompanyingDocumentReference,
    accompanyingDocumentDateOfIssue
  ].some((obligation) => fulfilments[obligation.id] !== undefined)

const documentBlockApplyTo = branchedGate(
  anyDocFieldPresent,
  {
    inScope: true,
    status: 'mandatory',
    reasons: [documentBlockMandatoryReason]
  },
  { inScope: true, status: 'optional' }
)

export const accompanyingDocumentType = {
  id: '60000008-0000-4000-8000-000000000008',
  name: 'accompanyingDocumentType',
  applyTo: documentBlockApplyTo
}

export const accompanyingDocumentAttachmentType = {
  id: '60000009-0000-4000-8000-000000000009',
  name: 'accompanyingDocumentAttachmentType',
  applyTo: documentBlockApplyTo
}

export const accompanyingDocumentReference = {
  id: '60000010-0000-4000-8000-000000000010',
  name: 'accompanyingDocumentReference',
  applyTo: documentBlockApplyTo
}

export const accompanyingDocumentDateOfIssue = {
  id: '60000011-0000-4000-8000-000000000011',
  name: 'accompanyingDocumentDateOfIssue',
  applyTo: documentBlockApplyTo
}
