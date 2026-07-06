import { registry } from '../registry.js'
import { isAnswered } from '../lib/answered.js'
import { applyPredicate } from './predicate.js'

/**
 * DEPTH-AWARE completeness — the engine-pure core that answers "is this
 * obligation's mandate met?" over the answers map. Split out of `status.js`
 * so the four-status roll-up depends on completeness one-way (status ->
 * complete), never the reverse. Imports zero `flow/` modules.
 */

/** One entry of a collection is COMPLETE when every required sub-obligation in
 * the item is satisfied — the per-item completeness fact the model gained in 6a,
 * now DEPTH-AWARE (6b): a sub-obligation that is itself a collection defers to
 * `collectionComplete`, which enforces "any entry that EXISTS must be complete"
 * and, when `requiredAtLeastOne`, also "≥1 entry". So a driver holding a
 * half-entered nested claim is not complete, whether or not its claims are
 * mandated — the mandate governs only whether ZERO entries is acceptable. */
export const entryComplete = (obligation, entry) => {
  const siblings = obligation.item ?? []
  return siblings.every((sub) => {
    // An ITEM-RELATIVE activation (entry 6c) is resolved against THIS entry: a
    // sub gated on a SIBLING is only OWED when that sibling's value satisfies it,
    // so a non-windscreen claim is not blocked by a missing provider. The
    // sibling-identity check (`siblings.includes(ref)`) is the SAME criterion
    // reconcile's `evalPredicate` uses — the two resolvers cannot diverge. A sub
    // gated on a NON-sibling (a top-level obligation) is not resolvable from
    // inside the entry, so it is left to reconcile/status and treated here as
    // owed (conservative — never falsely complete).
    const ref = sub.activatedBy?.obligation
    if (
      ref &&
      siblings.includes(ref) &&
      !applyPredicate(sub.activatedBy, entry?.[ref.id])
    ) {
      return true
    }
    return sub.collection
      ? collectionComplete(sub, entry?.[sub.id])
      : !sub.required || isAnswered(entry?.[sub.id])
  })
}

/** A collection is SATISFIED when it meets its cardinality mandate AND every
 * entry is complete — not merely "≥1 entry exists" (DISCUSSION-LOG entry 6,
 * finding 4). A blank-required-field claim no longer counts the section done. */
export const collectionComplete = (obligation, value) => {
  const entries = value ?? []
  if (obligation.requiredAtLeastOne && entries.length === 0) return false
  return entries.every((entry) => entryComplete(obligation, entry))
}

/** "Is this obligation's mandate met?" — a collection descends into its items;
 * a scalar is just answered/not. The one place completeness knows about depth. */
export const satisfied = (id, answers) => {
  const obligation = registry.byId(id)
  return obligation?.collection
    ? collectionComplete(obligation, answers[id])
    : isAnswered(answers[id])
}
