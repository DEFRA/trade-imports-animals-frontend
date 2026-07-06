import { hadClaims } from '../driving-history/obligations.js'

/**
 * Claims — the one repeating collection (0..n, user add/remove), now a
 * FIRST-CLASS indexed obligation (DISCUSSION-LOG entry 6a). Pure data; the ONLY
 * import is sideways, to the driving-history obligation that activates this
 * collection — a real JS reference across features, exactly the shared DAG the
 * feature model expects.
 *
 * Its item is a real nested array of sub-obligation OBLIGATIONS, not an inert
 * `fields:[...]` string list. Each sub-obligation is an ordinary pure obligation
 * (identity + mandate facts): `claimType` is owed (required), `claimAmount`
 * is optional. The engine now SEES them — per-instance scope, per-instance
 * wipe, per-item completeness and dispatch coverage all descend into the item.
 *
 * Sub-obligation ids are FRAME-RELATIVE (`claimType`, not `claims.claimType`): the id
 * is the key inside each entry object (`answers.claims[0].claimType`) and the
 * DOM field name — both unchanged, which is what makes the re-expression
 * zero-DOM. Identity is (claims, arrayIndex) minted on append — no id ledger.
 */
export const claimType = { id: 'claimType', required: true }
export const claimAmount = { id: 'claimAmount' }

/**
 * ITEM-SCOPED CONDITIONALITY (DISCUSSION-LOG entry 6c). A windscreen claim must
 * name its approved repairer — an obligation activated by a SIBLING FIELD within
 * the same claim item (`claimType === 'windscreen'`), so it comes into scope for
 * THAT claim instance only. The `activatedBy` references the sibling obligation object;
 * reconcile resolves it item-relatively at the claim's exact path.
 */
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
