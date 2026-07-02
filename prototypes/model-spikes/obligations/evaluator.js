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
 *   1. tolerate-and-amend (drop fulfilments for unknown obligation ids)
 *   2. per-obligation state (call each obligation's own `evaluate`)
 *   3. scope-exit purge (drop fulfilments for obligations now out-of-scope)
 */

export function createObligationEvaluator({
  obligations = defaultObligations
} = {}) {
  const obligationIds = new Set(obligations.map((o) => o.id))

  return {
    evaluate(fulfilments) {
      // 1. Tolerate-and-amend: drop fulfilments whose id isn't in the
      //    current obligations model.
      const toleranceAmended = {}
      for (const [id, value] of Object.entries(fulfilments)) {
        if (obligationIds.has(id)) {
          toleranceAmended[id] = value
        }
      }

      // 2. Per-obligation state — each obligation is its own evaluator.
      //    Single-pass; fixed-point behaviour lives in the orchestrator per
      //    §The evaluation engine.
      const perObligationState = {}
      for (const obligation of obligations) {
        perObligationState[obligation.id] =
          obligation.evaluate(toleranceAmended)
      }

      // 3. Scope-exit purge: drop fulfilments for obligations now
      //    out-of-scope. Matches §Fulfilments storage scope-exit rule and
      //    the Scope-exit row in §Key properties.
      const amendedFulfilments = { ...toleranceAmended }
      for (const [id, state] of Object.entries(perObligationState)) {
        if (state.inScope === false) {
          delete amendedFulfilments[id]
        }
      }

      return {
        fulfilments: amendedFulfilments,
        obligations: perObligationState
      }
    }
  }
}
