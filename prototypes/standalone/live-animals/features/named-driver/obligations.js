import { addons } from '../addons/obligations.js'

export const driverClaimType = { id: 'claimType', required: true }
export const driverClaimAmount = { id: 'claimAmount' }

export const driverWindscreenProvider = {
  id: 'windscreenProvider',
  required: true,
  activatedBy: { obligation: driverClaimType, equals: 'windscreen' },
  wipeOnExit: true
}

/**
 * This nested `claims` and the top-level claims collection share the id
 * `claims` but are distinct obligations at distinct template addresses
 * (`drivers.claims` vs `claims`) — do not deduplicate them.
 */
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

export const obligations = [drivers]
