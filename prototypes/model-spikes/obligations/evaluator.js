import { obligations as defaultObligations } from './obligations.js'

/**
 * ObligationEvaluator.
 *
 * Pure sync evaluator per §The ObligationEvaluator in
 * prototypes/model-spikes/obligations.md. Constructed once per Service with
 * the Obligations model; each `evaluate(fulfilments)` call is pure. Other
 * injectable dependencies (config, now, randomSeed, logger, …) can be added
 * to the constructor options object as they become needed — see §I.
 *
 * Obligations are the source of truth for both data and applicability logic
 * (see `obligations.js`). Each obligation carries its own `evaluate` method
 * inline, so this factory reduces to pure orchestration:
 *
 *   1. remove spurious fulfilments (ones whose id doesn't match any current
 *      obligation — the "tolerate-and-amend" rule; see §Persistence →
 *      Model versioning).
 *   2. compute per-obligation state by calling each obligation's own
 *      `evaluate`.
 *   3. remove out-of-scope fulfilments (the appliesWhen scope-exit purge;
 *      see §Key properties → Scope exit).
 */

export function createObligationEvaluator({
  obligations = defaultObligations
} = {}) {
  const obligationIds = new Set(obligations.map((o) => o.id))

  // Drop fulfilments whose id doesn't match any current obligation.
  // For example, we might have amended the obligation model since the user last saved progress.
  const removeSpuriousFulfilments = (fulfilments) => {
    const result = {}
    for (const [id, value] of Object.entries(fulfilments)) {
      if (obligationIds.has(id)) {
        result[id] = value
      }
    }
    return result
  }

  // Drop fulfilments for obligations that came out of scope in the current
  // evaluation pass (per-obligation `evaluate` returned `inScope: false`).
  const removeOutOfScopeFulfilments = (fulfilments, perObligationState) => {
    const result = { ...fulfilments }
    for (const [id, state] of Object.entries(perObligationState)) {
      if (state.inScope === false) {
        delete result[id]
      }
    }
    return result
  }

  return {
    evaluate(fulfilments) {
      const recognisedFulfilments = removeSpuriousFulfilments(fulfilments)

      // Single-pass per-obligation evaluation. Fixed-point behaviour lives
      // in the orchestrator per §The evaluation engine.
      const perObligationState = {}
      for (const obligation of obligations) {
        perObligationState[obligation.id] = obligation.evaluate(
          recognisedFulfilments
        )
      }

      const amendedFulfilments = removeOutOfScopeFulfilments(
        recognisedFulfilments,
        perObligationState
      )

      return {
        fulfilments: amendedFulfilments,
        obligations: perObligationState
      }
    }
  }
}
