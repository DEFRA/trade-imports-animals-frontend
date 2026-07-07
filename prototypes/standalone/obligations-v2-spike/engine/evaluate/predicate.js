import { isAnswered } from '../../lib/answered.js'
import { valueAt } from '../../lib/path.js'

export function applyPredicate(activatedBy, value) {
  if ('equals' in activatedBy) return value === activatedBy.equals
  if ('includes' in activatedBy) {
    return [].concat(value ?? []).includes(activatedBy.includes)
  }
  if ('present' in activatedBy) return isAnswered(value) === activatedBy.present
  throw new Error(
    `Unknown activation predicate: ${JSON.stringify(Object.keys(activatedBy))}`
  )
}

/**
 * A reference to one of this node's siblings resolves item-relatively (within
 * `framePath`); this criterion must stay identical to complete.js's
 * `entryComplete`.
 */
export function evalPredicate(
  activatedBy,
  answers,
  framePath = [],
  siblings = []
) {
  const referencedObligation = activatedBy.obligation
  const value = siblings.includes(referencedObligation)
    ? valueAt(answers, [...framePath, referencedObligation.id])
    : answers[referencedObligation.id]
  return applyPredicate(activatedBy, value)
}
