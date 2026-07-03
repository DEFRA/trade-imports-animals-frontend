import { isAnswered } from './util.js'

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
 * controller, not the model.
 */
export function evalPredicate(activatedBy, answers) {
  const value = answers[activatedBy.obligation.id]
  if ('equals' in activatedBy) return value === activatedBy.equals
  if ('includes' in activatedBy) {
    return [].concat(value ?? []).includes(activatedBy.includes)
  }
  if ('present' in activatedBy) return isAnswered(value) === activatedBy.present
  throw new Error(
    `Unknown activation predicate: ${JSON.stringify(Object.keys(activatedBy))}`
  )
}
