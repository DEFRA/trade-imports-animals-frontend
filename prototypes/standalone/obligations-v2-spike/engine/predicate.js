import { isAnswered } from '../lib/answered.js'
import { valueAt } from '../lib/path.js'

/**
 * The tiny activation vocabulary. `activatedBy` is a data literal over a
 * REAL obligation reference — never a closure — so the model reads like
 * data and reconcile stays the single interpreter:
 *
 *   { obligation: <ref>, equals:  'yes' }        // scalar equality
 *   { obligation: <ref>, includes:'named-driver' } // membership in a multi-select
 *   { obligation: <ref>, present: true }         // answered (non-blank)
 *
 * Deliberately small: anything needing real branching belongs in a page
 * controller, not the model. The three operators are UNCHANGED at entry 6c —
 * what grew is RESOLUTION, not vocabulary (see `evalPredicate`).
 */
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
 * Resolve an `activatedBy` against the answers, ITEM-RELATIVELY when it points
 * at a sibling (DISCUSSION-LOG entry 6c). Item-relativeness is INFERRED, not
 * declared: if the referenced obligation is one of the current node's `siblings`
 * (the item def list it was walked from), the reference resolves within THIS
 * item's frame — `answers[...framePath][ref.id]` — so a windscreen claim
 * activates its provider for THAT claim instance only. Otherwise the reference
 * is a top-level answer, exactly as before. No marker on the predicate, no new
 * operator — the same `{ obligation, equals }` literal works at any depth.
 */
export function evalPredicate(
  activatedBy,
  answers,
  framePath = [],
  siblings = []
) {
  const ref = activatedBy.obligation
  const value = siblings.includes(ref)
    ? valueAt(answers, [...framePath, ref.id])
    : answers[ref.id]
  return applyPredicate(activatedBy, value)
}
