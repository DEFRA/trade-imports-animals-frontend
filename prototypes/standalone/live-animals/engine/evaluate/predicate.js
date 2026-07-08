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
 * Resolve `activatedBy` against a node's frame chain (INNERMOST-FIRST — see
 * registry.js#walk). Three resolution modes, keyed by the OPT-IN `frame`:
 *
 * - absent (default) — the reference resolves in the node's OWN frame: a
 *   same-frame sibling (`frames[0].siblings.includes(ref)`) reads inside this
 *   entry, anything else reads the top-level answer. This is the pre-M2
 *   behaviour and is unchanged: `frames[0]` carries the `framePath`/`siblings`
 *   the resolver used before. The sibling-identity criterion stays identical
 *   to complete.js's `entryComplete`.
 * - `frame: "enclosing"` — the reference lives in an ENCLOSING frame. Walk
 *   strictly outward (`frames.slice(1)`, nearest first) to the first frame
 *   whose obligation list contains the reference, and read it there. Not found
 *   in any enclosing frame → unresolvable → not activated (out of scope).
 * - `frame: "anyItem"` — the reference lives in the ITEMS of a collection; the
 *   predicate holds if ANY item satisfies it. Find the nearest frame holding a
 *   collection whose item list contains the reference, then test every entry.
 */
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
