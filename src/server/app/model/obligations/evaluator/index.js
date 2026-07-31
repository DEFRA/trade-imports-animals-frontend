import { obligations as configuredObligations } from '../manifest.js'
import { convergePurge } from './converge-purge.js'
import { enumerateGroupFulfilmentIds } from './enumeration/enumerate-group-fulfilment-ids.js'
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
 * See obligations.md for the model and FULFILMENT_SHAPES.md for storage
 * examples.
 *
 * Constructed once per Service; each `evaluate(fulfilments)` call is
 * pure. The obligations manifest is injected at construction.
 *
 * Scope resolution: every obligation with an `applyTo` receives
 * `applyTo(fulfilments, fulfilmentIdsByObligationId)` where the second
 * arg is a `Map<obligationId, string[]>` of currently-present
 * group-instance-paths, enumerated pre-purge from raw storage. This
 * lets gated obligations look up their parent-group's instance-paths
 * without enumerating storage themselves — see `helpers.js` for the
 * common gate shapes (`allowListed`, `allowListedByPredicate`,
 * `branchedGate`, `anyAllowListed`).
 *
 * Algorithm per call:
 *
 *   1. Drop unknown obligation ids (tolerate-and-amend).
 *   2. Converge on the post-purge view via fixpoint iteration:
 *      repeat {enumerate group paths → evaluate `applyTo` →
 *      compute effective inScope → purge storage} until the
 *      fulfilments map stops changing. Every `applyTo` is thus
 *      exercised against the same post-purge view all other gates
 *      see — a value this call is purging cannot silently drive
 *      another gate. Bounded by `MAX_PURGE_ITERATIONS` for safety;
 *      convergence typically hits in 1-2 iterations for real
 *      manifests because `purgeStorage` is monotonic (never adds).
 *   3. Post-purge enumeration for group implications.
 *   4. Build per-obligation implications (category-specific shape;
 *      groups/leaves carry a `records` array).
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
      // 1. Drop unknown obligation ids.
      const recognisedFulfilments = dropUnknownFulfilments(
        fulfilments,
        obligationsById
      )

      // 2. Fixpoint: converge applyTo + purge on a stable post-purge
      // view. Each iteration enumerates group paths from the current
      // view, runs applyTo against that view, computes effective
      // inScope, and purges storage. When the view stops changing,
      // every applyTo has been exercised against the same post-purge
      // fulfilments — a value purged in this call cannot leak into
      // another gate's decision (the two-hop failure mode where a
      // purged value silently drives a second gate).
      const {
        amendedFulfilments,
        obligationApplicabilityDecisions,
        isInScope
      } = convergePurge(recognisedFulfilments, {
        obligations,
        obligationsById,
        obligationsByCategory,
        obligationAncestorGroups,
        obligationDescendants
      })

      // 3. Post-purge enumeration — group instance-paths for implication
      // building (accounts for records dropped by the converged purge).
      const fulfilmentIdsByObligationId = enumerateGroupFulfilmentIds(
        obligations,
        {
          obligationsByCategory,
          obligationAncestorGroups,
          obligationDescendants,
          isInScope,
          amendedFulfilments
        }
      )

      // 4. Build implications.
      const implicationsByObligation = buildImplications(obligations, {
        isInScope,
        obligationsByCategory,
        obligationApplicabilityDecisions,
        fulfilmentIdsByObligationId,
        amendedFulfilments
      })

      return {
        fulfilments: amendedFulfilments,
        obligations: implicationsByObligation
      }
    }
  }
}
