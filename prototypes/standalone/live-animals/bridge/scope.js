/**
 * Project the obligation evaluator's implications into the `scope` object the
 * controllers and hub consume — `makeScope(answers)`, four members.
 *
 * The load-bearing member is `inScope: Set<pathKey>` — one key for every
 * in-scope node, a mix of:
 *   - bare top-level ids            `'countryOfOrigin'`
 *   - the group obligation node     `'commodityLines'`,
 *                                   `'commodityLines[0].animalIdentifiers'`
 *   - positional leaf paths         `'commodityLines[0].commoditySelection'`,
 *                                   `'commodityLines[0].animalIdentifiers[1].animalIdentifierPassport'`
 * The group OBLIGATION node is keyed once per parent instance, never a bare
 * group instance (`'commodityLines[0]'` is not a key).
 *
 * The set is built from the evaluator output: answers ->
 * `answersToFulfilments` -> `evaluate` -> project each in-scope implication
 * into the pathKey grammar (composite->positional conversion).
 *
 * Vocabulary does NOT bite here: inScope keys are obligation ids and positional
 * indices, never values, so the normalisation `answersToFulfilments` applies
 * leaves the projected keys unchanged.
 */

import { obligations } from '../model/obligations/obligations.js'
import { createObligationEvaluator } from '../model/obligations/evaluator.js'
import {
  answersToFulfilments,
  ancestorChain,
  fulfilmentIdToPath,
  groupObligations
} from './fulfilments.js'
import { pathKey } from '../lib/path.js'
import { isAnswered } from '../lib/answered.js'
import { computeReadyForCheckYourAnswers } from '../engine/readiness-config.js'
import { FLOW_ONLY_OBLIGATIONS } from '../flow/obligation-source.js'

const evaluator = createObligationEvaluator()

// `anyInstanceAnswered` — look up the obligation named `id` and walk the
// answers tree over its ancestor-group chain, testing each positional instance
// with `isAnswered`. The manifest does not carry importType / declaration, but
// `answered()` is only ever consulted for `ENFORCED_AT_CONTINUE` prerequisites
// (`countryOfOrigin`, `commoditySelection`, flow/gates.js), which it does — so
// the check is exact.
const collectInstanceValues = (answers, chain, name) => {
  const values = []
  const visit = (node, remainingGroups) => {
    if (remainingGroups.length === 0) {
      values.push(node?.[name])
      return
    }
    const [group, ...rest] = remainingGroups
    const items = node?.[group.name]
    if (!Array.isArray(items)) return
    for (const item of items) visit(item, rest)
  }
  visit(answers, chain)
  return values
}

const anyInstanceAnswered = (answers, id) => {
  const obligation = obligations.find((candidate) => candidate.name === id)
  if (!obligation) return false
  return collectInstanceValues(answers, ancestorChain(obligation), id).some(
    isAnswered
  )
}

// Add every pathKey an in-scope implication projects onto.
const addProjectedKeys = (inScope, implications, obligation) => {
  const aId = obligation.name
  const chain = ancestorChain(obligation)

  if (groupObligations.has(obligation)) {
    // The group node is keyed once per PARENT-group instance (a depth-0
    // group has no parent, so a single bare key). Derived from the
    // parent's instances, not the group's own records, so a parent
    // instance whose nested group is empty still contributes its node key.
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
 * The RAW evaluator scope, projected into the pathKey grammar — the manifest
 * only, before the flow-only projection. importType/declaration are ABSENT here
 * because the notification model does not carry them. `makeScope` layers the
 * flow-only obligations on TOP of this for the FULL scope the controllers
 * consume; this export stays the raw evaluator scope.
 */
export const rawInScope = (answers) => projectInScope(answers)

// Flow-only obligations the notification model does not carry: the pre-journey
// import-type filter (the service entry filter) and the
// submit-time declaration step. The evaluator omits them, so without this layer
// their owning pages would be unreachable. Both are unconditional top-level
// obligations (bare-id pathKeys). Declared in flow/obligation-source.js so
// the answer-key recognition surface and this projection share one list.

// Project the flow-only obligations onto the FULL scope. Both are unconditional
// top-level obligations (no `activatedBy`, no collection ancestor), always in
// scope regardless of answers. An additive layer only; the raw evaluator scope
// (`rawInScope`) is untouched.
const projectFlowOnlyScope = (inScope) => {
  for (const id of FLOW_ONLY_OBLIGATIONS) inScope.add(id)
}

/**
 * Project the evaluator output into the `scope` object the controllers and hub
 * consume.
 *
 * `readyForCheckYourAnswers` comes from the boot-injected fn
 * (`flow/section-status.js`'s `readyForCheckYourAnswers`, reached through
 * `engine/readiness-config.js`), which rolls up the task rows via `rowStatus` /
 * `statusOf` — so passing the projected `inScope` yields readiness without this
 * module importing `read.js`.
 *
 * The FULL scope also carries the flow-only obligations the notification model
 * does not model (importType, declaration — `projectFlowOnlyScope`), so their
 * owning pages stay reachable. That projection is additive on the full scope
 * only; the raw evaluator scope (`rawInScope`) still excludes them.
 * `readyForCheckYourAnswers` is unaffected — its task rows never cover
 * importType/declaration.
 *
 * @param {object} answers - the nested answer POJO.
 * @returns {{ inScope: Set<string>, has: (id: string) => boolean,
 *   answered: (id: string) => boolean, readyForCheckYourAnswers: boolean }}
 */
export const makeScope = (answers) => {
  const inScope = projectInScope(answers)
  projectFlowOnlyScope(inScope)
  return {
    inScope,
    has: (id) => inScope.has(id),
    answered: (id) => anyInstanceAnswered(answers, id),
    readyForCheckYourAnswers: computeReadyForCheckYourAnswers(answers, inScope)
  }
}
