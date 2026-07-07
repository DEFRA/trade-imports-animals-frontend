import { isAnswered } from '../../lib/answered.js'
import { valueAt } from '../../lib/path.js'

export function applyPredicate(activatedBy, value) {
  if ('equals' in activatedBy) return value === activatedBy.equals
  // `includes` is set intersection: the answer (scalar or multi-select) and
  // the target (one value or a list) each normalise to a list, and the gate
  // fires when they share a member. The single/single case degenerates to
  // equality; a list target reads "the answer is one of these" (e.g.
  // numberOfPackages's 54-entry commodity list).
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
