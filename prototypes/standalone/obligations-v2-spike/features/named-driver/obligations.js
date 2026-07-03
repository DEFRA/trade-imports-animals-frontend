import { addons } from '../addons/obligations.js'

/**
 * Named drivers — now an INDEXED collection that NESTS (DISCUSSION-LOG entry 6b).
 * The single add-on became `drivers` (0..n), and each driver OWNS its own nested
 * `claims` collection — a real loop-inside-a-loop in the model. Pure data; the
 * only import is sideways, to the `addons` obligation that activates the whole
 * collection.
 *
 * The nesting is literal: `drivers.item` contains sub-obligations AND a nested
 * collection def (`driverClaims`), so the model tree reaches depth 2
 * (`drivers[i].claims[j].claimType`). Sub-def ids are frame-relative, so this
 * nested `claims` and the top-level driving-history `claims` share the id but are
 * distinct defs at distinct template addresses (`drivers.claims` vs `claims`).
 *
 * A driver requires a name + relationship; its claims are OPTIONAL
 * (requiredAtLeastOne omitted), so a driver with no claims is still complete —
 * but each claim it DOES hold must be complete (per-item completeness recurses).
 */
export const driverClaimType = { id: 'claimType', required: true }
export const driverClaimAmount = { id: 'claimAmount' }

/** Item-scoped conditionality at FULL depth (entry 6c): a windscreen claim under
 * a driver names its approved repairer, activated by that claim's own sibling
 * `claimType` — so `drivers[i].claims[j].windscreenProvider` is in scope iff
 * `drivers[i].claims[j].claimType === 'windscreen'`, per instance. */
export const driverWindscreenProvider = {
  id: 'windscreenProvider',
  required: true,
  activatedBy: { obligation: driverClaimType, equals: 'windscreen' },
  wipeOnExit: true
}

export const driverClaims = {
  id: 'claims',
  collection: true,
  item: [driverClaimType, driverClaimAmount, driverWindscreenProvider],
  wipeOnExit: true
}

export const driverName = { id: 'driverName', required: true }
export const driverDob = { id: 'driverDob' }
export const relationship = { id: 'relationship', required: true }

export const drivers = {
  id: 'drivers',
  collection: true,
  item: [driverName, driverDob, relationship, driverClaims],
  activatedBy: { obligation: addons, includes: 'named-driver' },
  requiredAtLeastOne: true,
  wipeOnExit: true
}

export const defs = [drivers]
