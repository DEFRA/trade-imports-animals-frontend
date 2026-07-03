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
  // The fulfilments map can have arbitrary depth for a nested indexed
  // obligation:
  //   - single-cardinality obligation → its value lives directly under
  //     the obligation's id
  //   - indexed obligation → a map lives under the obligation's id,
  //     keyed by fulfilmentId
  //   - nested-indexed obligation → an N-level nested map lives under
  //     the obligation's id; depth = length of `indexedBy.nested` + 1
  //     (e.g. driverAddress is depth 2: driver id → address id;
  //     driverClaimOtherParty is depth 3: driver id → claim id → party id)
  //
  // Two rules applied per obligation:
  //
  //   1. If the obligation's implication has inScope: false, drop its
  //      top-level entry from the fulfilments map.
  //
  //   2. If the obligation is in-scope and its implication includes a
  //      `fulfilments` array, recursively purge the stored map against
  //      that array: at each level, any key not named in the
  //      corresponding `fulfilments` (or `subFulfilments`) array is
  //      stale and gets dropped. `purgeLevel` handles this recursion.
  //
  // Examples of rule 2 in practice:
  //
  //   modificationCost (depth 1) — user removed 'alloys' from
  //   modifications controller:
  //     stored:  { turbo: '800', alloys: '200' }
  //     applyTo: { fulfilments: [{ fulfilmentId: 'turbo', ... }] }
  //     after:   { turbo: '800' }
  //
  //   driverAddress (depth 2) — controller (driver collection) still
  //   has driver-1, and only 'addr-a' is a valid address for them:
  //     stored:  { 'driver-1': { 'addr-a': {...}, 'addr-b': {...} } }
  //     applyTo: { fulfilments: [{
  //       fulfilmentId: 'driver-1',
  //       subFulfilments: [{ fulfilmentId: 'addr-a', ... }]
  //     }] }
  //     after:   { 'driver-1': { 'addr-a': {...} } }
  //
  //   driverClaimOtherParty (depth 3) — one driver, one claim, one
  //   valid party (stale 'party-b' gets dropped from the inner-inner
  //   map):
  //     stored:  { 'driver-1': { 'claim-1': { 'party-a': {...}, 'party-b': {...} } } }
  //     applyTo: { fulfilments: [{
  //       fulfilmentId: 'driver-1',
  //       subFulfilments: [{
  //         fulfilmentId: 'claim-1',
  //         subFulfilments: [{ fulfilmentId: 'party-a', ... }]
  //       }]
  //     }] }
  //     after:   { 'driver-1': { 'claim-1': { 'party-a': {...} } } }
  //
  // Rule 2 powers the derived lifecycle at every level. For user-driven
  // indexed levels it is effectively a no-op: their applyTo emits one
  // entry for every fulfilmentId already in storage, so nothing is ever
  // stale from their own perspective.
  const purgeLevel = (storedAtLevel, validEntries) => {
    const validIds = new Set(validEntries.map((e) => e.fulfilmentId))
    const purged = { ...storedAtLevel }
    for (const key of Object.keys(purged)) {
      if (!validIds.has(key)) delete purged[key]
    }
    for (const entry of validEntries) {
      if (entry.subFulfilments && purged[entry.fulfilmentId]) {
        purged[entry.fulfilmentId] = purgeLevel(
          purged[entry.fulfilmentId],
          entry.subFulfilments
        )
      }
    }
    return purged
  }

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
        result[obligationId] = purgeLevel(
          result[obligationId],
          implication.fulfilments
        )
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
