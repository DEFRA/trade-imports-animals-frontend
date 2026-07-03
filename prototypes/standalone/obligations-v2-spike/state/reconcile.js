import { registry } from './obligations/registry.js'
import { evalPredicate } from './predicate.js'
import { isAnswered } from './util.js'

/**
 * THE pure state evaluator — the single home of activation + scope-exit
 * wipe (v1's two evaluators collapsed into one).
 *
 * `reconcile(answers) -> { inScope:Set, wiped:[obligationId] }`:
 *  - inScope is computed to a FIXPOINT over the activation graph, so a
 *    controlling answer that brings others into scope (which may bring
 *    yet more) settles in one call.
 *  - wiped names every `wipeOnExit` obligation that is now OUT of scope
 *    but still holds data. The caller (store.commit) DELETES those keys —
 *    data is destroyed, not hidden, so re-entering scope starts blank and
 *    can never rehydrate (the Yes-No-Yes invariant).
 *
 * Pure and zero-I/O: nothing here reads or writes the store.
 */
export function reconcile(answers) {
  const inScope = new Set()
  let changed = true
  while (changed) {
    changed = false
    for (const o of registry.all) {
      if (inScope.has(o.id)) continue
      if (!o.activatedBy || evalPredicate(o.activatedBy, answers)) {
        inScope.add(o.id)
        changed = true
      }
    }
  }

  const wiped = registry.all
    .filter(
      (o) => o.wipeOnExit && !inScope.has(o.id) && isAnswered(answers[o.id])
    )
    .map((o) => o.id)

  return { inScope, wiped }
}
