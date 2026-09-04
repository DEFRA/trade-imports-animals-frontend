/**
 * branchedGate — evaluate a predicate; return whenTrue or whenFalse.
 * Use for retain-value / status-swap patterns where both branches are
 * in-scope (e.g. the accompanying-document all-or-nothing block).
 *
 * `predicateMeta` (optional) — structured description of the predicate
 * so the reachability prover can synthesise a witness without executing
 * the closure:
 *
 *   { operator: 'equals'   , obligationId, value: string    }
 *   { operator: 'includes' , obligationId, values: string[] }
 *   { operator: 'isFilled' , obligationId                   }
 *
 * When both branches are in-scope the gate is TOTAL — no witness is
 * needed and `predicateMeta` may be omitted. Non-total sites MUST supply
 * it or the coverage assertion fails the build. Adding a new `operator`
 * means updating `analysis/reachability.js` `synthesiseWitness`.
 */
export const branchedGate = (predicate, whenTrue, whenFalse, predicateMeta) => {
  const fn = (fulfilments, fulfilmentIndexesByObligationId) =>
    predicate(fulfilments, fulfilmentIndexesByObligationId)
      ? whenTrue
      : whenFalse
  fn.metadata = {
    type: 'branchedGate',
    whenTrue,
    whenFalse,
    predicateMeta: predicateMeta ?? null
  }
  return fn
}
