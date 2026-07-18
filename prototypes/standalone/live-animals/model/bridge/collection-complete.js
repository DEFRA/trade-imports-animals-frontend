/**
 * Bridge — B's per-instance completeness -> collectionView's `complete`.
 *
 * collectionView reads A's positional storage for a collection's entries;
 * inc-014 dual-paths ONLY the per-entry `complete` flag. entries / index /
 * path stay A-side (A owns storage under both flags — inc-012, inc-013), so
 * an empty or partial A entry is never lost; only its completeness follows B.
 *
 * Instance identity is positional (A's array index), the same under both
 * flags. `instanceFulfilmentId` maps an A positional entry to B's composite
 * fulfilmentId prefix with the bridge's existing segment machinery, exactly
 * as scope.js / purge.js convert composite <-> positional.
 *
 * `entryCompleteFromB` reproduces B's `containerStatus`-FULFILLED verdict
 * scoped to one instance: the instance is complete iff B's evaluator finds
 * no unsatisfied mandatory concern beneath it — a mandatory leaf record left
 * unfulfilled (`effectiveStatus` semantics: a record's `status`, defaulting
 * to mandatory), or an unmet per-instance group invariant
 * (`groupInvariantErrors`, the `requires.anyOf` at-least-one rule).
 *
 * Structural B-only obligations (commodityType c-037, the notification-level
 * accompanyingDocument block, the two system fields) are declared in B but
 * not in A's model, so the model-equivalence oracle filters them out of every
 * axis (`isStructuralBOnly`). The completeness axis mirrors that: A's
 * entryComplete never sees them, so B must not let them mark an instance
 * incomplete — otherwise every commodity line would read incomplete under `b`
 * (A carries no `commodityType` value at all).
 *
 * Known structural divergence (a find, not repaired): B infers instances from
 * leaf composite prefixes, so a fully-EMPTY nested instance (a unit with no
 * stored leaf) vanishes on round-trip and B cannot flag its unmet `anyOf`.
 * A, reading its own array, still shows that entry and marks it incomplete.
 * A fully-empty TOP-LEVEL entry is caught here via its unconditional
 * mandatory field leaves, which A and B agree on. See DESIGN-DELTA.md §12.
 */

import { obligations } from '../obligations/obligations.js'
import { createObligationEvaluator } from '../obligations/evaluator.js'
import {
  answersToFulfilments,
  ancestorChain,
  groupObligations,
  instanceFulfilmentId
} from './fulfilments.js'
import { groupInvariantErrors } from '../engine/index.js'
import { isBlankValue } from '../engine/is-blank-value.js'
import { domain } from '../domain/index.js'

const evaluator = createObligationEvaluator()
const evaluate = (answers) => evaluator.evaluate(answersToFulfilments(answers))

const byAName = new Map(obligations.map((o) => [o.name, o]))

const STRUCTURAL_B_ONLY = new Set([
  'commodityType',
  'accompanyingDocumentType',
  'accompanyingDocumentAttachmentType',
  'accompanyingDocumentReference',
  'accompanyingDocumentDateOfIssue',
  'poApprovedReferenceNumber',
  'responsiblePersonForLoad'
])

const isFulfilled = (obligationId, value) => {
  const entry = domain.get(obligationId)
  if (entry?.type === 'address' && typeof entry.isComplete === 'function') {
    return entry.isComplete(value)
  }
  return !isBlankValue(value)
}

// A leaf record's fulfilmentId belongs to instance P iff it IS P (a direct
// leaf of the instance's own group) or sits beneath it (`P/...`, a nested
// group's leaf) — the same positional-prefix rule the evaluator uses.
const belongsToInstance = (fulfilmentId, instanceId) =>
  fulfilmentId === instanceId || fulfilmentId.startsWith(`${instanceId}/`)

const leavesUnder = (group) =>
  obligations.filter(
    (o) => !groupObligations.has(o) && ancestorChain(o).includes(group)
  )

// The group itself plus every group nested beneath it — the scope over which
// per-instance `anyOf` invariants are checked.
const groupsFrom = (group) =>
  obligations.filter(
    (o) =>
      groupObligations.has(o) &&
      (o === group || ancestorChain(o).includes(group))
  )

/**
 * B's per-instance completeness for the A collection entry at
 * `collectionPath[index]`. True iff B's evaluator finds no unsatisfied
 * mandatory concern anywhere beneath the instance.
 *
 * @param {object} answers - A's nested answer POJO.
 * @param {Array<string|number>} collectionPath - A collection path.
 * @param {number} index - positional entry index within that collection.
 * @returns {boolean}
 */
export const entryCompleteFromB = (answers, collectionPath, index) => {
  const names = collectionPath.filter((segment) => typeof segment === 'string')
  const group = byAName.get(names[names.length - 1])
  if (!group) return true
  const instanceId = instanceFulfilmentId(collectionPath, index)
  const { obligations: implications, fulfilments } = evaluate(answers)

  for (const leaf of leavesUnder(group)) {
    if (STRUCTURAL_B_ONLY.has(leaf.name)) continue
    const implication = implications[leaf.id]
    if (!implication?.inScope) continue
    const stored = fulfilments[leaf.id]
    const belonging = (implication.records ?? []).filter((record) =>
      belongsToInstance(record.fulfilmentId, instanceId)
    )
    // An unconditional mandatory field leaf directly under this group is a
    // concern for the instance even when B enumerated no record — an empty A
    // entry has no B leaf storage, so B never sees the instance, but A still
    // shows the entry and its mandatory fields are unfilled.
    if (belonging.length === 0 && leaf.within === group && !leaf.applyTo) {
      if ((leaf.status ?? 'mandatory') === 'mandatory') {
        if (!isFulfilled(leaf.id, stored?.[instanceId])) return false
      }
      continue
    }
    for (const record of belonging) {
      if ((record.status ?? 'mandatory') !== 'mandatory') continue
      if (!isFulfilled(leaf.id, stored?.[record.fulfilmentId])) return false
    }
  }

  const state = { obligations: implications, fulfilments }
  for (const nested of groupsFrom(group)) {
    if (!nested.requires?.anyOfIds) continue
    for (const error of groupInvariantErrors(nested, state)) {
      if (error.instanceId && belongsToInstance(error.instanceId, instanceId)) {
        return false
      }
    }
  }
  return true
}
