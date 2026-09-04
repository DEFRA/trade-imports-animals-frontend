import { enumerateGroupPathsFromStorage } from './enumeration/enumerate-group-paths-from-storage.js'
import { fulfilmentsEqual } from './internal/fulfilments-equal.js'
import { purgeStorage } from './purge/purge-storage.js'
import { makeInScopeCheck } from './scope/make-in-scope-check.js'
import { runApplicabilityDecisions } from './scope/run-applicability-decisions.js'

// Fixpoint safety cap. Real manifests converge in 1-2 iterations because
// `purgeStorage` is monotonic (never adds), but a pathological gate design
// (e.g. an `applyTo` that flips inScope based on absence) could oscillate —
// better to throw than silently truncate.
const MAX_PURGE_ITERATIONS = 16

// Repeat {enumerate → applyTo → isInScope → purge} until the amended
// fulfilments stop shrinking, so every applyTo sees the same post-purge
// view its neighbours see.
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
    // Warm `isInScope`'s memoisation cache so `purgeStorage` and downstream
    // callers see a fully populated closure.
    for (const obligation of obligations) {
      isInScope(obligation)
    }

    const next = purgeStorage(amendedFulfilments, {
      obligationsById,
      obligationsByCategory,
      applicabilityDecisions,
      isInScope
    })

    const converged = fulfilmentsEqual(amendedFulfilments, next)
    amendedFulfilments = next
    if (converged) {
      return {
        amendedFulfilments,
        applicabilityDecisions,
        isInScope
      }
    }
  }
  throw new Error(
    `ObligationEvaluator: applyTo/purge did not converge within ${MAX_PURGE_ITERATIONS} iterations — check for oscillating gate design`
  )
}
