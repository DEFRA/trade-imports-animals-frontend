/**
 * ObligationEvaluator — iteration 1.
 *
 * Pure sync function per §The ObligationEvaluator in
 * prototypes/model-spikes/obligations.md.
 *
 * Iteration 1 supports single-cardinality, always-in-scope, always-mandatory
 * obligations only. No conditional logic, no reason emission, no indexed
 * obligations, no system-handled types. Just the return-shape mechanics and
 * tolerate-and-amend.
 */

export function evaluateObligations(obligations, fulfilments) {
  const obligationIds = new Set(obligations.map((o) => o.id))

  const amendedFulfilments = {}
  for (const [id, value] of Object.entries(fulfilments)) {
    if (obligationIds.has(id)) {
      amendedFulfilments[id] = value
    }
  }

  const perObligation = {}
  for (const obligation of obligations) {
    perObligation[obligation.id] = {
      inScope: true,
      status: 'mandatory'
    }
  }

  return {
    fulfilments: amendedFulfilments,
    obligations: perObligation
  }
}
