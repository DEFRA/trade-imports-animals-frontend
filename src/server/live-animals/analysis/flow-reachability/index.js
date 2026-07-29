/**
 * flow-reachability — the FLOW-level reachability prover.
 *
 * The graph prover (`model/analysis/reachability.js`) proves the obligation
 * DEPENDENCY graph terminates at a seed and every gate has a value-level
 * witness. It says nothing about PAGES: whether an in-scope obligation is
 * presented by a page, and whether that page is reachable through the flow
 * gates in the state that puts the obligation in scope. This module carries
 * those two checks over the manifest + the flow tree.
 *
 * Two problem kinds:
 *   - `no-owning-page`                 an obligation is in scope but no page
 *                                      presents it (dispatch has no owner).
 *   - `owning-page-unreachable-in-scope` the owning page is not reached by the
 *                                      flow gates in that same state.
 * Plus the enumeration's own completeness check (`proveScopeCompleteness`):
 * a manifest obligation no seed variant × scope state ever scopes is
 * reported rather than silently skipped.
 *
 * Scope comes from `engine`'s `makeScope` (the evaluator projected into the
 * pathKey grammar), page ownership from `flow/dispatch.js`, and page
 * reachability from `analysis/simulate.js`'s `simulateJourney` (which walks
 * the section/page gates over `makeScope`).
 */

export { enumerateScopeStates } from './fixtures/scope-states.js'
export { seedVariants, submitReadySeed } from './fixtures/seeds.js'
export {
  REASON_NO_OWNING_PAGE,
  REASON_UNREACHABLE_IN_SCOPE
} from './problems/reasons.js'
export { proveFlowReachability, proveScopeCompleteness } from './provers.js'
