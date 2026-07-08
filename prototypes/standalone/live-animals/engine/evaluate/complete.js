import { registry } from '../../registry.js'
import { isAnswered } from '../../lib/answered.js'
import { applyPredicate, evalPredicate } from './predicate.js'

export const entryComplete = (obligation, entry, ctx = null) => {
  const siblings = obligation.item ?? []
  const groupSatisfied =
    !obligation.requiredOneOf ||
    obligation.requiredOneOf.some((id) => isAnswered(entry?.[id]))
  if (!groupSatisfied) return false
  return siblings.every((subObligation) => {
    const referencedObligation = subObligation.activatedBy?.obligation
    if (referencedObligation) {
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
  return collectionComplete(obligation, answers[id], {
    answers,
    basePath: [id],
    enclosingFrames: [{ framePath: [], siblings: registry.all }]
  })
}
