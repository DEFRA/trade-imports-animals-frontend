import { obligations as configuredObligations } from '../manifest.js'
import { convergePurge } from './converge-purge.js'
import { enumerateGroupFulfilmentIndexesPostPurge } from './enumeration/enumerate-group-fulfilment-indexes-post-purge.js'
import { buildImplications } from './implications/build.js'
import { buildAncestorGroups } from './manifest-index/build-ancestor-groups.js'
import { buildDescendants } from './manifest-index/build-descendants.js'
import { buildObligationChildren } from './manifest-index/build-obligation-children.js'
import { buildObligationsById } from './manifest-index/build-obligations-by-id.js'
import { classifyObligations } from './manifest-index/classify-obligations.js'
import { dropUnknownFulfilments } from './purge/drop-unknown-fulfilments.js'

/**
 * ObligationEvaluator.
 *
 * Pure sync evaluator over the flat, composite-key `fulfilments` map.
 * Constructed once per Service; each `evaluate(fulfilments)` call is
 * pure. The obligations manifest is injected at construction.
 *
 * Every applyTo receives
 * `applyTo(fulfilments, fulfilmentIndexesByObligationId)` — the second
 * arg is a `Map<obligationId, string[]>` of currently-present group
 * fulfilmentIndexes enumerated pre-purge from raw storage. Gated
 * obligations can look up their parent-group's fulfilmentIndexes
 * without enumerating storage themselves — see `helpers/index.js`.
 *
 * Algorithm per call:
 *
 *   1. Drop unknown obligation ids (tolerate-and-amend).
 *   2. Fixpoint: repeat {enumerate → applyTo → isInScope → purge}
 *      until the fulfilments map stops changing. Guarantees every
 *      applyTo sees the same post-purge view, so a value being purged
 *      in this call cannot silently drive another gate. Bounded by
 *      `MAX_PURGE_ITERATIONS`; typically converges in 1-2 iterations
 *      because `purgeStorage` is monotonic.
 *   3. Post-purge enumeration for group implications (accounts for
 *      entries dropped by the converged purge).
 *   4. Build per-obligation implications.
 */

export function createObligationEvaluator({
  obligations = configuredObligations()
} = {}) {
  const obligationsById = buildObligationsById(obligations)
  const obligationChildren = buildObligationChildren(obligations)
  const obligationsByCategory = classifyObligations(
    obligations,
    obligationChildren
  )
  const obligationAncestorGroups = buildAncestorGroups(obligations)
  const obligationDescendants = buildDescendants(
    obligations,
    obligationChildren
  )

  return {
    evaluate(fulfilments) {
      const recognisedFulfilments = dropUnknownFulfilments(
        fulfilments,
        obligationsById
      )

      const { amendedFulfilments, applicabilityDecisions, isInScope } =
        convergePurge(recognisedFulfilments, {
          obligations,
          obligationsById,
          obligationsByCategory,
          obligationAncestorGroups,
          obligationDescendants
        })

      const fulfilmentIndexesByObligationId =
        enumerateGroupFulfilmentIndexesPostPurge(obligations, {
          obligationsByCategory,
          obligationAncestorGroups,
          obligationDescendants,
          isInScope,
          amendedFulfilments
        })

      const implicationsByObligation = buildImplications(obligations, {
        isInScope,
        obligationsByCategory,
        applicabilityDecisions,
        fulfilmentIndexesByObligationId,
        amendedFulfilments
      })

      return {
        fulfilments: amendedFulfilments,
        obligations: implicationsByObligation
      }
    }
  }
}
