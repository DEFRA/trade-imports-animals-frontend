/**
 * branchedGate — evaluate a predicate; return whenTrue or whenFalse.
 *
 * Use for extended-form scope decisions where both branches are
 * in-scope (retain-value / status-swap patterns like the accompanying-
 * document all-or-nothing block).
 *
 * The predicate has the same signature as an applyTo function:
 * `(fulfilments, fulfilmentIndexesByObligationId) → boolean`.
 *
 * `predicateMeta` (optional) — structured description of the predicate
 * shape so the reachability prover can synthesise a witness
 * value that opens the gate without executing the closure. Shape:
 *
 *   { operator: 'equals'    , obligationId: string, value: string  }  // fulfilments[id] === value
 *   { operator: 'includes'  , obligationId: string, values: string[] } // values.includes(fulfilments[id])
 *   { operator: 'isFilled'  , obligationId: string                  }  // any non-blank value on id
 *
 * When both `whenTrue.inScope` and `whenFalse.inScope` are `true` the
 * gate is TOTAL and no witness is needed (the prover treats these as
 * trivially open). The four accompanying-document siblings are the
 * only manifest occurrence of that shape today; they omit
 * `predicateMeta` because it isn't consulted. All non-total sites
 * MUST supply `predicateMeta` — the coverage assertion fails the build
 * for a non-total `branchedGate` without one.
 *
 * Every new predicate operator carries a second tax — a witness
 * synthesiser + a seeding rule. Adding a new `operator` here means
 * updating `analysis/reachability.js` `synthesiseWitness`.
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
