import { isAnswered } from '../../lib/answered.js'
import { valueAt } from '../../lib/path.js'

export function applyPredicate(activatedBy, value) {
  if ('equals' in activatedBy) return value === activatedBy.equals
  if ('includes' in activatedBy) {
    const targets = [].concat(activatedBy.includes)
    return []
      .concat(value ?? [])
      .some((candidate) => targets.includes(candidate))
  }
  if ('present' in activatedBy) return isAnswered(value) === activatedBy.present
  throw new Error(
    `Unknown activation predicate: ${JSON.stringify(Object.keys(activatedBy))}`
  )
}

export function evalPredicate(
  activatedBy,
  answers,
  frames = [{ framePath: [], siblings: [] }]
) {
  const referencedObligation = activatedBy.obligation

  if (activatedBy.frame === 'enclosing') {
    for (const { framePath, siblings } of frames.slice(1)) {
      if (siblings.includes(referencedObligation)) {
        return applyPredicate(
          activatedBy,
          valueAt(answers, [...framePath, referencedObligation.id])
        )
      }
    }
    return false
  }

  if (activatedBy.frame === 'anyItem') {
    for (const { framePath, siblings } of frames) {
      const collection = siblings.find((candidate) =>
        candidate.item?.includes(referencedObligation)
      )
      if (!collection) continue
      const entries = valueAt(answers, [...framePath, collection.id]) ?? []
      return entries.some((entry) =>
        applyPredicate(activatedBy, entry?.[referencedObligation.id])
      )
    }
    return false
  }

  const { framePath, siblings } = frames[0]
  const value = siblings.includes(referencedObligation)
    ? valueAt(answers, [...framePath, referencedObligation.id])
    : answers[referencedObligation.id]
  return applyPredicate(activatedBy, value)
}
