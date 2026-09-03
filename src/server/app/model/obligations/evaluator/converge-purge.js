import { enumerateGroupPathsFromStorage } from './enumeration/enumerate-group-paths-from-storage.js'
import { viewsEqual } from './internal/views-equal.js'
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
// until the view stops shrinking. Each iteration replaces the view
// with the just-purged fulfilments, so the next applyTo sees exactly
// what every other gate is going to see.
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

  let view = recognisedFulfilments
  let applicabilityDecisions
  let isInScope

  for (let iteration = 0; iteration < MAX_PURGE_ITERATIONS; iteration++) {
    const groupPaths = enumerateGroupPathsFromStorage(
      obligations,
      obligationsByCategory,
      obligationAncestorGroups,
      obligationDescendants,
      view
    )
    applicabilityDecisions = runApplicabilityDecisions(
      obligations,
      view,
      groupPaths
    )
    isInScope = makeInScopeCheck(
      applicabilityDecisions,
      obligationAncestorGroups
    )
    for (const obligation of obligations) {
      isInScope(obligation)
    }

    const next = purgeStorage(view, {
      obligationsById,
      obligationsByCategory,
      applicabilityDecisions,
      isInScope
    })

    if (viewsEqual(view, next)) {
      return {
        amendedFulfilments: next,
        applicabilityDecisions: applicabilityDecisions,
        isInScope
      }
    }
    view = next
  }
  throw new Error(
    `ObligationEvaluator: applyTo/purge did not converge within ${MAX_PURGE_ITERATIONS} iterations — check for oscillating gate design`
  )
}
