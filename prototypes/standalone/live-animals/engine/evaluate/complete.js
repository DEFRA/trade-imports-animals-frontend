import { registry } from '../../registry.js'
import { isAnswered } from '../../lib/answered.js'
import { applyPredicate, evalPredicate } from './predicate.js'

/**
 * `ctx` (OPT-IN, inc-035) carries enclosing-frame context so a sub-field gated
 * on an ENCLOSING frame (`activatedBy.frame === 'enclosing' | 'anyItem'`) can be
 * resolved for completeness — matching the scope `reconcile` computes, so a
 * REQUIRED enclosing-gated field (permanentAddress) is not counted owed on a
 * unit whose enclosing gate is off. Its shape mirrors what `evalPredicate`
 * expects: `{ answers, frames }`, where `frames` is THIS entry's innermost-first
 * chain (`[{ framePath, siblings }, ...enclosing, root]`).
 *
 * ABSENT ctx (the default) = pre-inc-035 behaviour, byte-for-byte: only
 * same-frame sibling gates resolve; a non-sibling gate falls through to the
 * per-field required check (treated as owed — conservative). `collectionView`
 * and the synthetic unit tests call with no ctx and are unchanged.
 */
export const entryComplete = (obligation, entry, ctx = null) => {
  const siblings = obligation.item ?? []
  // Group mandate `requiredOneOf`: at least one of a NAMED subset of this
  // entry's sibling fields must be answered (V4 "at least one animal
  // identifier PER ANIMAL"). Each named field stays individually optional —
  // the requirement bites at the group, once per entry. The named ids are
  // same-frame siblings, so this reads `entry[id]` directly: no gate
  // resolution, no enclosing context. Absent marker = no group check, so every
  // pre-existing collection is byte-for-byte unchanged.
  const groupSatisfied =
    !obligation.requiredOneOf ||
    obligation.requiredOneOf.some((id) => isAnswered(entry?.[id]))
  if (!groupSatisfied) return false
  return siblings.every((subObligation) => {
    const referencedObligation = subObligation.activatedBy?.obligation
    if (referencedObligation) {
      // The sibling-identity check (`siblings.includes(ref)`) is the SAME
      // criterion reconcile's `evalPredicate` uses — the two resolvers cannot
      // diverge. A same-frame sibling gate that is OFF means the field is out
      // of scope for this entry, so it is not owed.
      if (siblings.includes(referencedObligation)) {
        if (
          !applyPredicate(
            subObligation.activatedBy,
            entry?.[referencedObligation.id]
          )
        ) {
          return true
        }
      } else if (ctx && subObligation.activatedBy.frame) {
        // Enclosing / anyItem gate — resolvable only WITH frame context. Off
        // gate → out of scope → not owed on this entry. Without ctx we cannot
        // resolve it, so it falls through to the per-field check (owed if
        // required) — the pre-inc-035 conservative default.
        if (
          !evalPredicate(subObligation.activatedBy, ctx.answers, ctx.frames)
        ) {
          return true
        }
      }
    }
    if (subObligation.collection) {
      return collectionComplete(
        subObligation,
        entry?.[subObligation.id],
        ctx && {
          answers: ctx.answers,
          basePath: [...ctx.frames[0].framePath, subObligation.id],
          // This entry's full chain becomes the nested collection's enclosing
          // frames, so a doubly-nested field still resolves an enclosing gate.
          enclosingFrames: ctx.frames
        }
      )
    }
    return !subObligation.required || isAnswered(entry?.[subObligation.id])
  })
}

export const collectionComplete = (obligation, value, ctx = null) => {
  const entries = value ?? []
  if (obligation.requiredAtLeastOne && entries.length === 0) return false
  return entries.every((entry, index) =>
    entryComplete(
      obligation,
      entry,
      ctx && {
        answers: ctx.answers,
        frames: [
          {
            framePath: [...ctx.basePath, index],
            siblings: obligation.item ?? []
          },
          ...ctx.enclosingFrames
        ]
      }
    )
  )
}

export const satisfied = (id, answers) => {
  const obligation = registry.byId(id)
  if (!obligation?.collection) return isAnswered(answers[id])
  // Seed the frame chain at the root so enclosing gates inside the collection
  // resolve exactly as reconcile does (the resolver-unity invariant).
  return collectionComplete(obligation, answers[id], {
    answers,
    basePath: [id],
    enclosingFrames: [{ framePath: [], siblings: registry.all }]
  })
}
