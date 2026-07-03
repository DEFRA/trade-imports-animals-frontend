import { pageOfObligation } from '../flow/dispatch.js'
import { reconcile } from '../engine/reconcile.js'
import { registry } from '../registry.js'
import { simulateJourney } from './simulate.js'

/**
 * MODEL-LEVEL reachability / dead-end prover (DISCUSSION-LOG entry 4).
 *
 * Proves the property "no owed obligation is unreachable": there is no scope
 * state in which an obligation is in scope (owed) but the page that owns it
 * can never be reached under that same scope. The boot coverage assertion
 * proves every obligation is collected by exactly one page; this goes further
 * and proves that page is actually REACHABLE whenever the obligation is owed.
 *
 * It is tractable because the model is tiny and the only scope-controlling
 * answers are a handful of activators over the three-operator predicate vocab
 * (`equals` / `includes` / `present`) — a small finite, enumerable domain. We
 * enumerate every combination of those activators, reconcile each to a scope,
 * and cross-check every in-scope obligation against the simulator's reachable
 * page set.
 *
 * SCOPE OF THE PROOF (entry-4 tension, resolved). This reasons about SCOPE,
 * not input VALIDITY. Whether a given answer is *valid* is not a model fact —
 * it lives in the controller's Joi field-map, and exposing that to the model
 * layer would re-couple model<->controller, the exact coupling v2's seams
 * exist to avoid. Completion-readiness (`required` / `requiredAtLeastOne`)
 * stays a pure model fact and is provable; input-validity deliberately is not.
 */

// The obligations that a page's/section's gate keys off — the full activator set.
const ADDONS = ['named-driver', 'modifications', 'protected-ncd']

const subsetsOf = (items) =>
  items.reduce((acc, item) => [...acc, ...acc.map((s) => [...s, item])], [[]])

/**
 * Every combination of the scope-controlling answers. Non-activating answers
 * are irrelevant to scope, so the space is exactly this cartesian product.
 */
export function enumerateScopeStates() {
  const states = []
  for (const hadClaims of ['no', 'yes']) {
    for (const voluntaryExcess of ['no', 'yes']) {
      for (const coverType of ['', 'comprehensive']) {
        for (const addons of subsetsOf(ADDONS)) {
          states.push({ hadClaims, voluntaryExcess, coverType, addons })
        }
      }
    }
  }
  return states
}

/**
 * Returns the list of reachability problems — EMPTY means proven: every owed
 * obligation is reachable in every scope state. `pagesFor` is injectable so a
 * test can prove the prover has teeth (feed a flow that drops a page).
 */
export function proveReachability({ pagesFor = simulateJourney } = {}) {
  const problems = []
  for (const answers of enumerateScopeStates()) {
    const { inScope } = reconcile(answers)
    const reachable = new Set(pagesFor(answers))
    for (const obligation of registry.all) {
      if (obligation.system || !inScope.has(obligation.id)) continue
      const pageId = pageOfObligation(obligation.id)
      if (!pageId) {
        problems.push({
          obligation: obligation.id,
          reason: 'no-owning-page',
          answers
        })
        continue
      }
      if (!reachable.has(pageId)) {
        problems.push({
          obligation: obligation.id,
          pageId,
          reason: 'owning-page-unreachable-in-scope',
          answers
        })
      }
    }
  }
  return problems
}
