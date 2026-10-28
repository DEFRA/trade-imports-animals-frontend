import { isNonArrayObject } from '../../helper-internals.js'
import { runGate } from './run-gate.js'
import { stampGateMetadata } from './stamp-gate-metadata.js'

const pairByFulfilmentIndex = (first, second) =>
  Object.fromEntries(
    Object.entries(isNonArrayObject(first) ? first : {}).map(
      ([fulfilmentIndex, value]) => [
        fulfilmentIndex,
        [value, second?.[fulfilmentIndex]]
      ]
    )
  )

/**
 * Shared factory for indexed-gate helpers (`allowListed`,
 * `allowListedPairs`, `notInUnionOf`). Params:
 *
 *   - `gateType`         — stamped onto `.metadata.gateType`.
 *                          Differs per flavour (`'allowListed'` vs
 *                          `'notInUnionOf'`).
 *   - `gateObligation`   — the obligation whose stored value the gate
 *                          reads. Its id is used for the storage lookup
 *                          and stamped on `.metadata.obligationId`.
 *   - `pairedObligation` — optional. When set, the gate reads each
 *                          fulfilmentIndex as the pair
 *                          `[gateObligation value, pairedObligation value]`
 *                          and its id is stamped on
 *                          `.metadata.pairedObligationId`.
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
  pairedObligation,
  currentValues,
  admits,
  gatedParentGroup,
  reasons
}) => {
  const gateFulfilment = (fulfilments) =>
    pairedObligation
      ? pairByFulfilmentIndex(
          fulfilments[gateObligation.id],
          fulfilments[pairedObligation.id]
        )
      : fulfilments[gateObligation.id]
  const fn = (fulfilments, fulfilmentIndexesByObligationId) => {
    const decision = runGate(
      gateFulfilment(fulfilments),
      admits,
      gatedParentGroup,
      fulfilmentIndexesByObligationId
    )
    return decision.inScope && reasons ? { ...decision, reasons } : decision
  }
  return stampGateMetadata(fn, {
    gateType,
    gateObligation,
    currentValues,
    ...(pairedObligation && { pairedObligationId: pairedObligation.id }),
    gatedParentGroupId: gatedParentGroup?.id ?? null,
    reasons: reasons ?? null
  })
}
