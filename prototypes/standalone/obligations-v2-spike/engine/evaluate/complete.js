import { registry } from '../../registry.js'
import { isAnswered } from '../../lib/answered.js'
import { applyPredicate } from './predicate.js'

export const entryComplete = (obligation, entry) => {
  const siblings = obligation.item ?? []
  return siblings.every((subObligation) => {
    // The sibling-identity check (`siblings.includes(ref)`) is the SAME
    // criterion reconcile's `evalPredicate` uses — the two resolvers cannot
    // diverge. A sub gated on a NON-sibling is not resolvable from inside the
    // entry, so it is treated as owed (conservative — never falsely complete).
    const referencedObligation = subObligation.activatedBy?.obligation
    if (
      referencedObligation &&
      siblings.includes(referencedObligation) &&
      !applyPredicate(
        subObligation.activatedBy,
        entry?.[referencedObligation.id]
      )
    ) {
      return true
    }
    return subObligation.collection
      ? collectionComplete(subObligation, entry?.[subObligation.id])
      : !subObligation.required || isAnswered(entry?.[subObligation.id])
  })
}

export const collectionComplete = (obligation, value) => {
  const entries = value ?? []
  if (obligation.requiredAtLeastOne && entries.length === 0) return false
  return entries.every((entry) => entryComplete(obligation, entry))
}

export const satisfied = (id, answers) => {
  const obligation = registry.byId(id)
  return obligation?.collection
    ? collectionComplete(obligation, answers[id])
    : isAnswered(answers[id])
}
