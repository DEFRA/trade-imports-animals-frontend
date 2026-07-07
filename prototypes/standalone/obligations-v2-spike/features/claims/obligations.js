import { hadClaims } from '../driving-history/obligations.js'

/**
 * Sub-obligation ids are frame-relative: id == entry-object key == DOM
 * field name — renaming one without the others silently breaks all three.
 */
export const claimType = { id: 'claimType', required: true }
export const claimAmount = { id: 'claimAmount' }

export const windscreenProvider = {
  id: 'windscreenProvider',
  required: true,
  activatedBy: { obligation: claimType, equals: 'windscreen' },
  wipeOnExit: true
}

export const claims = {
  id: 'claims',
  collection: true,
  item: [claimType, claimAmount, windscreenProvider],
  activatedBy: { obligation: hadClaims, equals: 'yes' },
  requiredAtLeastOne: true,
  wipeOnExit: true
}

export const obligations = [claims]
