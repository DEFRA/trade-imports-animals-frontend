import { findStructuralDefects } from './defects.js'
import { closeReachableSet } from './close.js'

/**
 * proveReachability — run the graph-level prover over a list of
 * `{ id, dependsOn }` records. Three-outcome enumeration:
 *
 *   {
 *     reachable:   string[],  // ids that trace to a seed
 *     unreachable: string[],  // ids whose deps never terminate at a seed
 *     errors:      { obligationId, reason }[]  // structural defects
 *   }
 *
 * Called from `analysis/reachability.test.js` and from this module's
 * own `proveWithWitnesses`, which walks `obligations` +
 * `obligationMetadata` to build the record list.
 *
 * @param {Array<{id: string, dependsOn: string[] | undefined}>} records
 * @returns {{ reachable: string[], unreachable: string[], errors: Array<{obligationId: string, reason: string}> }}
 */
export const proveReachability = (records) => {
  const byId = new Map(records.map((record) => [record.id, record]))
  const { errors, structurallyBad } = findStructuralDefects(records, byId)
  const reachable = closeReachableSet(records, structurallyBad)
  const unreachable = records
    .filter((rec) => !reachable.has(rec.id) && !structurallyBad.has(rec.id))
    .map((rec) => rec.id)

  return {
    reachable: [...reachable],
    unreachable,
    errors
  }
}
