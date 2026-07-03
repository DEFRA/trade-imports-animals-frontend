import { hadClaims } from '../driving-history/obligations.js'

/**
 * Claims — the one repeating collection (0..n, user add/remove). Pure data;
 * the ONLY import is sideways, to the driving-history obligation that
 * activates this collection — a real JS reference across features, exactly
 * the shared DAG the feature model expects (not a self-contained box).
 *
 * Identity is (claims, arrayIndex) minted on append — no id ledger.
 * `cardinality` + `fields` describe the value's JSON SHAPE (an array of
 * { claimType, claimAmount }), a structural state fact — not a "type".
 */
export const claims = {
  id: 'claims',
  cardinality: 'indexed',
  fields: ['claimType', 'claimAmount'],
  activatedBy: { obligation: hadClaims, equals: 'yes' },
  requiredAtLeastOne: true,
  wipeOnExit: true
}

export const defs = [claims]
