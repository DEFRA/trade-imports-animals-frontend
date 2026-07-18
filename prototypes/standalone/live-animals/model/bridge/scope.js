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
import { makeScopeA } from '../../engine/read.js'

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
 * Project B's evaluator output into A's `scope` object shape.
 *
 * Shape-identical to `engine/read.js`'s `makeScope`.
 *
 * `readyForCheckYourAnswers` is deferred to A's boot-injected fn (via
 * A's `makeScopeA`) for the dark phase — status derivation from B's
 * `journeyState`/`containerStatus` is inc-017a's job, and deferring
 * keeps the shape identical without pulling status derivation forward.
 *
 * @param {object} answers - A's nested answer POJO.
 * @returns {{ inScope: Set<string>, has: (id: string) => boolean,
 *   answered: (id: string) => boolean, readyForCheckYourAnswers: boolean }}
 */
export const makeScopeFromB = (answers) => {
  const inScope = projectInScope(answers)
  return {
    inScope,
    has: (id) => inScope.has(id),
    answered: (id) => anyInstanceAnswered(answers, id),
    readyForCheckYourAnswers: makeScopeA(answers).readyForCheckYourAnswers
  }
}
