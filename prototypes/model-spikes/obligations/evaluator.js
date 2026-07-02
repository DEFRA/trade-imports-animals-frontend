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
 * (see `obligations.js`). Each obligation carries its own `applyTo` method
 * inline, which returns that obligation's **implication** for the current
 * fulfilments. This factory reduces to pure orchestration:
 *
 *   1. remove spurious fulfilments (ones whose id doesn't match any current
 *      obligation — the "tolerate-and-amend" rule; see §Persistence →
 *      Model versioning).
 *   2. compute each obligation's implication by calling its own `applyTo`.
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

  // Scope-exit purge: remove entries from the fulfilments map that no
  // longer reflect the implication each obligation returned from its
  // applyTo.
  //
  // The fulfilments map has two levels:
  //   - single-cardinality obligation → its value lives directly under
  //     the obligation's id
  //   - indexed obligation → a nested map lives under the obligation's
  //     id, keyed by fulfilmentId (e.g. one per user-added claim, or one
  //     per selected modification)
  //
  // Two rules, applied per obligation:
  //
  //   1. If the obligation's implication has inScope: false, drop its
  //      top-level entry from the fulfilments map.
  //
  //   2. If the obligation is indexed and in-scope (its implication
  //      includes a `fulfilments` array of per-fulfilment entries), that
  //      array is the authoritative list of fulfilmentIds that should
  //      exist. Any stored fulfilmentId not in that list is stale and
  //      gets dropped from the nested map.
  //
  //      Example: modificationCost has stored
  //        { turbo: '800', alloys: '200' }
  //      but the user has just removed 'alloys' from the modifications
  //      controller. The derived applyTo now returns
  //        { inScope: true, fulfilments: [{ fulfilmentId: 'turbo', ... }] }
  //      This pass drops 'alloys' from the stored map, leaving
  //        { turbo: '800' }
  //
  // The second rule is what powers the derived lifecycle. When the user
  // removes a controller value, the derived obligation's applyTo stops
  // including that fulfilmentId in its returned array — this pass then
  // removes it from storage. For user-driven indexed obligations the
  // second rule is a no-op: their applyTo returns one entry for every
  // fulfilmentId already in storage, so nothing is ever stale.
  const removeOutOfScopeFulfilments = (
    fulfilments,
    implicationsByObligation
  ) => {
    const result = { ...fulfilments }
    for (const [obligationId, implication] of Object.entries(
      implicationsByObligation
    )) {
      if (implication.inScope === false) {
        delete result[obligationId]
        continue
      }
      if (implication.fulfilments && result[obligationId]) {
        const validFulfilmentIds = new Set(
          implication.fulfilments.map((f) => f.fulfilmentId)
        )
        const storedFulfilments = { ...result[obligationId] }
        for (const fulfilmentId of Object.keys(storedFulfilments)) {
          if (!validFulfilmentIds.has(fulfilmentId)) {
            delete storedFulfilments[fulfilmentId]
          }
        }
        result[obligationId] = storedFulfilments
      }
    }
    return result
  }

  return {
    evaluate(fulfilments) {
      const recognisedFulfilments = removeSpuriousFulfilments(fulfilments)

      // Single-pass per-obligation evaluation — collect each obligation's
      // implication for the current fulfilments. Fixed-point behaviour
      // lives in the orchestrator per §The evaluation engine.
      const implicationsByObligation = {}
      for (const obligation of obligations) {
        implicationsByObligation[obligation.id] = obligation.applyTo(
          recognisedFulfilments
        )
      }

      const amendedFulfilments = removeOutOfScopeFulfilments(
        recognisedFulfilments,
        implicationsByObligation
      )

      return {
        fulfilments: amendedFulfilments,
        obligations: implicationsByObligation
      }
    }
  }
}
