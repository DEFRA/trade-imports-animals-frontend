import { hadClaims } from '../driving-history/obligations.js'

/**
 * Claims — the one repeating collection (0..n, user add/remove), now a
 * FIRST-CLASS indexed obligation (DISCUSSION-LOG entry 6a). Pure data; the ONLY
 * import is sideways, to the driving-history obligation that activates this
 * collection — a real JS reference across features, exactly the shared DAG the
 * feature model expects.
 *
 * Its item is a real nested array of sub-obligation DEFS, not an inert
 * `fields:[...]` string list. Each sub-def is an ordinary pure obligation
 * (identity + mandate facts): `claimType` is owed (required), `claimAmount`
 * is optional. The engine now SEES them — per-instance scope, per-instance
 * wipe, per-item completeness and dispatch coverage all descend into the item.
 *
 * Sub-def ids are FRAME-RELATIVE (`claimType`, not `claims.claimType`): the id
 * is the key inside each entry object (`answers.claims[0].claimType`) and the
 * DOM field name — both unchanged, which is what makes the re-expression
 * zero-DOM. Identity is (claims, arrayIndex) minted on append — no id ledger.
 */
export const claimType = { id: 'claimType', required: true }
export const claimAmount = { id: 'claimAmount' }

export const claims = {
  id: 'claims',
  collection: true,
  item: [claimType, claimAmount],
  activatedBy: { obligation: hadClaims, equals: 'yes' },
  requiredAtLeastOne: true,
  wipeOnExit: true
}

export const defs = [claims]
