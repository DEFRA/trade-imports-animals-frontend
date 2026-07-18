/**
 * Bridge — B's obligation implications -> A's `scope` object.
 *
 * `makeScopeFromB(answers)` is a drop-in for `engine/read.js`'s
 * `makeScope(answers)` (PLAN §3, M2 inc-009): same four members, same
 * types, so at cutover (inc-012) A's controllers/hub consume B's scope
 * through the interface they use today. Wired behind `MODEL=b` at
 * inc-012 — `engine/read.js`'s `makeScope` dispatches here when the flag
 * is 'b'; A's engine (`makeScopeA`) stays the default.
 *
 * The load-bearing member is `inScope: Set<pathKey>`. A builds it in
 * `engine/evaluate/reconcile.js` by walking its obligation forest and
 * adding `pathKey(node.path)` for every in-scope node — a mix of:
 *   - bare top-level ids            `'countryOfOrigin'`
 *   - the group obligation node     `'commodityLines'`,
 *                                   `'commodityLines[0].animalIdentifiers'`
 *   - positional leaf paths         `'commodityLines[0].commoditySelection'`,
 *                                   `'commodityLines[0].animalIdentifiers[1].animalIdentifierPassport'`
 * A keys the group OBLIGATION node (once per parent instance), never a
 * bare group instance (`'commodityLines[0]'` is not a key).
 *
 * This module reproduces that exact set from B's evaluator output:
 * A's answers -> `answersToFulfilments` (inc-008, A->B vocab normalised)
 * -> `evaluate` -> project each in-scope implication back into A's
 * pathKey grammar with inc-008's composite->positional conversion.
 *
 * Vocabulary does NOT bite here: inScope keys are obligation ids and
 * positional indices, never values, so the A->B normalisation that
 * `answersToFulfilments` applies to drive B's gates leaves the projected
 * keys A-vocab on both sides. See DESIGN-DELTA.md §8.
 */

import { obligations } from '../obligations/obligations.js'
import { createObligationEvaluator } from '../obligations/evaluator.js'
import {
  answersToFulfilments,
  ancestorChain,
  fulfilmentIdToPath,
  groupObligations
} from './fulfilments.js'
import { pathKey, valueAt } from '../../lib/path.js'
import { walk } from '../../registry.js'
import { isAnswered } from '../../lib/answered.js'
import { computeReadyForCheckYourAnswers } from '../../engine/readiness-config.js'
import { reconcile } from '../../engine/evaluate/reconcile.js'

const evaluator = createObligationEvaluator()

// A's `anyInstanceAnswered` (engine/read.js) — walks A's answers via A's
// registry and matches on A's obligation id, so `answered()` keeps
// delegating to A's own answered logic rather than B's fulfilments.
const anyInstanceAnswered = (answers, id) => {
  for (const node of walk(answers)) {
    if (node.obligation.id === id && isAnswered(valueAt(answers, node.path))) {
      return true
    }
  }
  return false
}

// Add every A pathKey an in-scope implication projects onto.
const addProjectedKeys = (inScope, implications, obligation) => {
  const aId = obligation.name
  const chain = ancestorChain(obligation)

  if (groupObligations.has(obligation)) {
    // A keys the group node once per PARENT-group instance (a depth-0
    // group has no parent, so a single bare key). Derived from the
    // parent's instances, not the group's own records, so a parent
    // instance whose nested group is empty still contributes its node
    // key — matching A's structural walk.
    if (chain.length === 0) {
      inScope.add(aId)
      return
    }
    const parentRecords = implications[obligation.within.id]?.records ?? []
    for (const { fulfilmentId } of parentRecords) {
      inScope.add(pathKey(fulfilmentIdToPath(chain, fulfilmentId, aId)))
    }
    return
  }

  const implication = implications[obligation.id]
  if (Array.isArray(implication.records)) {
    // Grouped leaf — one positional pathKey per in-scope record.
    for (const { fulfilmentId } of implication.records) {
      inScope.add(pathKey(fulfilmentIdToPath(chain, fulfilmentId, aId)))
    }
  } else {
    // Top-level scalar/field — the bare obligation id.
    inScope.add(aId)
  }
}

const projectInScope = (answers) => {
  const { obligations: implications } = evaluator.evaluate(
    answersToFulfilments(answers)
  )
  const inScope = new Set()
  for (const obligation of obligations) {
    if (implications[obligation.id]?.inScope) {
      addProjectedKeys(inScope, implications, obligation)
    }
  }
  return inScope
}

/**
 * B's RAW evaluator scope, projected into A's pathKey grammar — B's manifest
 * only, before any A-side flow projection. This is the set the oracle diffs
 * against A (model-equivalence.test.js's `rawScope`): importType/declaration
 * are ABSENT here because B does not model them, per retrofit/mapping.json's
 * `a-only` entries. `makeScopeFromB` layers the A-side flow obligations on TOP
 * of this for the FULL scope the controllers consume; this export stays the
 * unchanged B side.
 */
export const rawInScopeFromB = (answers) => projectInScope(answers)

// A-side flow obligations B does not model (retrofit/mapping.json, kind
// `a-only`): the pre-journey import-type filter (`c-024`/`c-032`) and the
// submit-time declaration. B has no counterpart, so B's evaluator omits them
// and their owning pages would be unreachable under `MODEL=b`. Both are
// unconditional top-level obligations in A's registry (bare-id pathKeys).
const A_ONLY_FLOW_OBLIGATIONS = ['importType', 'declaration']

// Project the A-only flow obligations onto the FULL scope using A's OWN
// reconcile — faithful to A's scope determination (and future-proof if A ever
// gates them), never touching B's raw evaluator scope. An additive layer only.
const projectAOnlyFlowScope = (answers, inScope) => {
  const { inScope: aScope } = reconcile(answers)
  for (const id of A_ONLY_FLOW_OBLIGATIONS) {
    if (aScope.has(id)) inScope.add(id)
  }
}

/**
 * Project B's evaluator output into A's `scope` object shape.
 *
 * Shape-identical to `engine/read.js`'s `makeScope`.
 *
 * `readyForCheckYourAnswers` is now B-derived (inc-017a): the boot-injected
 * fn (`flow/section-status.js`'s `readyForCheckYourAnswers`, reached through
 * `engine/readiness-config.js`) rolls up the task rows via `rowStatus`, which
 * dual-paths to `statusOfFromB` under `MODEL=b` — so passing B's projected
 * `inScope` yields a fully B-derived readiness with no call into `makeScopeA`.
 * Consuming the registry module (not `read.js`) severs the `scope.js ->
 * engine/read.js` edge that inc-012/013 flagged for M4 (only `read.js ->
 * scope.js` remains — a clean DAG).
 *
 * The FULL scope also carries the A-side flow obligations B does not model
 * (importType, declaration — `projectAOnlyFlowScope`, inc-018), so their owning
 * pages stay reachable under `MODEL=b`. That projection is additive on the full
 * scope only; B's raw evaluator scope (`rawInScopeFromB`, what the oracle diffs)
 * is unchanged and still excludes them. `readyForCheckYourAnswers` is unaffected
 * — its task rows never cover importType/declaration.
 *
 * @param {object} answers - A's nested answer POJO.
 * @returns {{ inScope: Set<string>, has: (id: string) => boolean,
 *   answered: (id: string) => boolean, readyForCheckYourAnswers: boolean }}
 */
export const makeScopeFromB = (answers) => {
  const inScope = projectInScope(answers)
  projectAOnlyFlowScope(answers, inScope)
  return {
    inScope,
    has: (id) => inScope.has(id),
    answered: (id) => anyInstanceAnswered(answers, id),
    readyForCheckYourAnswers: computeReadyForCheckYourAnswers(answers, inScope)
  }
}
