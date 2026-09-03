import { enumerateGroupPathsFromStorage } from './enumeration/enumerate-group-paths-from-storage.js'
import { fulfilmentsEqual } from './internal/fulfilments-equal.js'
import { purgeStorage } from './purge/purge-storage.js'
import { makeInScopeCheck } from './scope/make-in-scope-check.js'
import { runApplicabilityDecisions } from './scope/run-applicability-decisions.js'

// Fixpoint safety cap for the applyTo/purge convergence loop. Real
// manifests are expected to converge in 1-2 iterations because
// `purgeStorage` is monotonic on storage (never adds), but a
// pathological gate design (e.g. an `applyTo` that flips inScope
// based on absence) could oscillate. Throwing after this cap is a
// louder signal than silently truncating.
const MAX_PURGE_ITERATIONS = 16

// Fixpoint loop: repeat {enumerate → applyTo → isInScope → purge}
// until the amended fulfilments stop shrinking. Each iteration
// replaces `amendedFulfilments` with the just-purged snapshot, so the
// next applyTo sees exactly what every other gate is going to see.
//
// Bounded by `MAX_PURGE_ITERATIONS`; throws if we exceed the cap so
// a pathological gate design fails loudly rather than silently
// truncating at some arbitrary iteration.
//
// Returns the final `{ amendedFulfilments, applicabilityDecisions,
// isInScope }` — the caller feeds these to enumeration + implication
// building.
export function convergePurge(recognisedFulfilments, context) {
  const {
    obligations,
    obligationsById,
    obligationsByCategory,
    obligationAncestorGroups,
    obligationDescendants
  } = context

  let amendedFulfilments = recognisedFulfilments
  let applicabilityDecisions
  let isInScope

  for (let iteration = 0; iteration < MAX_PURGE_ITERATIONS; iteration++) {
    const groupPaths = enumerateGroupPathsFromStorage(
      obligations,
      obligationsByCategory,
      obligationAncestorGroups,
      obligationDescendants,
      amendedFulfilments
    )
    applicabilityDecisions = runApplicabilityDecisions(
      obligations,
      amendedFulfilments,
      groupPaths
    )
    isInScope = makeInScopeCheck(
      applicabilityDecisions,
      obligationAncestorGroups
    )
    for (const obligation of obligations) {
      isInScope(obligation)
    }

    const next = purgeStorage(amendedFulfilments, {
      obligationsById,
      obligationsByCategory,
      applicabilityDecisions,
      isInScope
    })

    // Termination: purge produced no new drops or filtered entries — the
    // fixpoint has settled and the caller can consume the amended snapshot.
    if (fulfilmentsEqual(amendedFulfilments, next)) {
      return {
        amendedFulfilments: next,
        applicabilityDecisions,
        isInScope
      }
    }
    amendedFulfilments = next
  }
  throw new Error(
    `ObligationEvaluator: applyTo/purge did not converge within ${MAX_PURGE_ITERATIONS} iterations — check for oscillating gate design`
  )
}
