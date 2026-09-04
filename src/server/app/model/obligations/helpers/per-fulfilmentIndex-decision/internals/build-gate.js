import { runGate } from './run-gate.js'

/**
 * Shared factory for indexed-gate helpers (`allowListed`,
 * `notInUnionOf`). Params:
 *
 *   - `gateType`         — stamped onto `.metadata.gateType`.
 *                          Differs per flavour (`'allowListed'` vs
 *                          `'notInUnionOf'`).
 *   - `gateObligation`   — the obligation whose stored value the gate
 *                          reads. Its id is used for the storage lookup
 *                          and stamped on `.metadata.obligationId`.
 *   - `currentValues`    — getter for the live allowlist / union;
 *                          wrapped by `Object.defineProperty` on
 *                          `.metadata.values` for lazy static
 *                          inspection. Differs per flavour.
 *   - `admits`           — the per-value predicate (in-list vs
 *                          not-in-union); `runGate` applies it
 *                          per fulfilmentIndex. Differs per flavour.
 *   - `gatedParentGroup` — optional. When set, `runGate` fans
 *                          the passing gate keys onto this group's
 *                          fulfilmentIndexes (a depth-N > 1 gate). Its
 *                          id is stamped on
 *                          `.metadata.gatedParentGroupId`, or `null`
 *                          when absent.
 *   - `reasons`          — optional array of `{ code, explanation }`
 *                          justifications. Merged into the decision
 *                          when in scope so downstream consumers can
 *                          explain WHY the obligation applies; also
 *                          stamped on `.metadata.reasons` (or `null`)
 *                          for static introspection.
 */
export const buildGate = ({
  gateType,
  gateObligation,
  currentValues,
  admits,
  gatedParentGroup,
  reasons
}) => {
  const fn = (fulfilments, fulfilmentIndexesByObligationId) => {
    const decision = runGate(
      fulfilments[gateObligation.id],
      admits,
      gatedParentGroup,
      fulfilmentIndexesByObligationId
    )
    return decision.inScope && reasons ? { ...decision, reasons } : decision
  }
  fn.metadata = {
    gateType,
    obligationId: gateObligation.id,
    gatedParentGroupId: gatedParentGroup?.id ?? null,
    reasons: reasons ?? null
  }
  Object.defineProperty(fn.metadata, 'values', {
    enumerable: true,
    get: currentValues
  })
  return fn
}
