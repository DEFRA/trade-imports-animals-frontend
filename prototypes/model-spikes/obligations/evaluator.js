import { obligations as defaultObligations } from './obligations/obligations.js'

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
  // The fulfilments map can have up to three levels:
  //   - single-cardinality obligation → its value lives directly under
  //     the obligation's id
  //   - indexed obligation → a map lives under the obligation's id,
  //     keyed by fulfilmentId (one per user-added claim, one per
  //     selected modification, etc.)
  //   - nested-indexed obligation → a two-level nested map lives under
  //     the obligation's id; outer keyed by outer fulfilmentId, inner
  //     keyed by inner fulfilmentId (e.g. driverAddress: outer = driver
  //     id, inner = address id per driver)
  //
  // Three rules, applied per obligation:
  //
  //   1. If the obligation's implication has inScope: false, drop its
  //      top-level entry from the fulfilments map.
  //
  //   2. If the obligation is indexed and in-scope (its implication
  //      includes a `fulfilments` array of per-fulfilment entries), that
  //      array is the authoritative list of fulfilmentIds that should
  //      exist at the outer level. Any stored outer key not in that list
  //      is stale and gets dropped.
  //
  //      Example: modificationCost has stored
  //        { turbo: '800', alloys: '200' }
  //      but the user has just removed 'alloys' from the modifications
  //      controller. The derived applyTo now returns
  //        { inScope: true, fulfilments: [{ fulfilmentId: 'turbo', ... }] }
  //      This pass drops 'alloys' from the stored map, leaving
  //        { turbo: '800' }
  //
  //   3. If any entry in the implication's `fulfilments` includes a
  //      `subFulfilments` array (nested indexing), that array is the
  //      authoritative list of inner fulfilmentIds under that outer key.
  //      Any stored inner key not in the list is stale and gets dropped.
  //
  //      Example: driverAddress has stored
  //        { 'driver-1': { 'addr-a': {...}, 'addr-b': {...} } }
  //      but the user has removed 'addr-b' from driver-1's address list.
  //      applyTo returns
  //        { inScope: true, fulfilments: [{
  //            fulfilmentId: 'driver-1',
  //            subFulfilments: [{ fulfilmentId: 'addr-a', ... }]
  //          }] }
  //      This pass drops 'addr-b' from the nested map, leaving
  //        { 'driver-1': { 'addr-a': {...} } }
  //
  // Rule 2 powers the derived lifecycle for single-level indexed
  // obligations. Rule 3 extends the same idea to nested indexed
  // obligations. For user-driven indexed obligations both rules are
  // effectively no-ops: their applyTo emits one entry for every
  // fulfilmentId already in storage, so nothing is ever stale from
  // their own perspective.
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
        // Rule 2: outer-level purge.
        const validOuterIds = new Set(
          implication.fulfilments.map((f) => f.fulfilmentId)
        )
        const storedOuter = { ...result[obligationId] }
        for (const outerKey of Object.keys(storedOuter)) {
          if (!validOuterIds.has(outerKey)) {
            delete storedOuter[outerKey]
          }
        }
        // Rule 3: nested (inner-level) purge for entries with
        // subFulfilments.
        for (const entry of implication.fulfilments) {
          if (entry.subFulfilments && storedOuter[entry.fulfilmentId]) {
            const validInnerIds = new Set(
              entry.subFulfilments.map((sf) => sf.fulfilmentId)
            )
            const storedInner = { ...storedOuter[entry.fulfilmentId] }
            for (const innerKey of Object.keys(storedInner)) {
              if (!validInnerIds.has(innerKey)) {
                delete storedInner[innerKey]
              }
            }
            storedOuter[entry.fulfilmentId] = storedInner
          }
        }
        result[obligationId] = storedOuter
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
