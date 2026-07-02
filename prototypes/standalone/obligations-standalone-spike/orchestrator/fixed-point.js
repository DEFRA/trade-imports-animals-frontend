import { isDeepStrictEqual } from 'node:util'
import { evaluateObligations } from '../engine/index.js'
import { reconcileDerived, wipeOutOfScope } from './scope-exit-wipe.js'
import { createSystemHandlerRun } from './system-handlers.js'

/**
 * Graft 6 — the per-request fixed-point loop (EVAL-33..36, FLOW-33).
 *
 * EVAL-35 — TODO review with Sam: this loop realises the paradigm
 * document's UNREVIEWED pseudocode sketch (obligations.md, §The
 * evaluation engine). It ships as INPUT to that review, not fait
 * accompli; a pinning test asserts this tag stays until the review lands.
 *
 * Iteration order, pinned by test: evaluate -> adopt the pruned set ->
 * sync derived fulfilments against their controllers -> wipe
 * out-of-scope data -> run system handlers; loop while anything changed.
 * In this stateless request/response reduction every yield in the sketch
 * is reinterpreted as render-and-end-request, handlers are synchronous
 * and deduped per request, so the loop converges in a handful of
 * iterations — and throws loudly rather than spinning if it ever does
 * not.
 */

const MAX_ITERATIONS = 10

/**
 * runToFixedPoint(obligations, fulfilments, options) ->
 * `{ fulfilments, evaluation, drops, wiped, iterations }` — the stable
 * post-pass fulfilments with the evaluation that certified them stable.
 * `options`: `scopeRegistry` / `externalState` (passed to the evaluator),
 * `handlers` (system-handler registry) and `maxIterations` — all
 * fixture seams; production callers pass none.
 */
export function runToFixedPoint(obligations, fulfilments = {}, options = {}) {
  const {
    handlers,
    maxIterations = MAX_ITERATIONS,
    ...evaluatorOptions
  } = options
  const runHandlers = createSystemHandlerRun({
    ...(handlers && { handlers })
  })

  let current = structuredClone(fulfilments)
  const drops = []
  const wiped = []

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const evaluation = evaluateObligations(
      obligations,
      current,
      evaluatorOptions
    )
    drops.push(...evaluation.drops)

    const derived = reconcileDerived(obligations, evaluation.fulfilments)
    const wipe = wipeOutOfScope(evaluation.obligations, derived.fulfilments)
    wiped.push(...wipe.wiped)
    const handled = runHandlers(
      obligations,
      evaluation.obligations,
      wipe.fulfilments
    )

    if (isDeepStrictEqual(handled.fulfilments, current)) {
      return {
        fulfilments: current,
        evaluation,
        drops,
        wiped,
        iterations: iteration
      }
    }
    current = handled.fulfilments
  }

  throw new Error(
    `Fixed-point pass did not converge within ${maxIterations} iterations`
  )
}
