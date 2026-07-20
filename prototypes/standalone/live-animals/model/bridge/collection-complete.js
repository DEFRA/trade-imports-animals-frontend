/**
 * Per-instance completeness -> collectionView's `complete`.
 *
 * collectionView reads positional storage for a collection's entries; this
 * module supplies the per-entry `complete` flag. entries / index / path stay
 * positional, so an empty or partial entry is never lost; only its completeness
 * comes from the evaluator.
 *
 * Instance identity is positional (the array index). `instanceFulfilmentId`
 * maps a positional entry to its composite fulfilmentId prefix with the segment
 * machinery, exactly as scope.js / purge.js convert composite <-> positional.
 *
 * `entryComplete` reproduces the `containerStatus`-FULFILLED verdict scoped to
 * one instance: the instance is complete iff the evaluator finds no unsatisfied
 * mandatory concern beneath it — a mandatory leaf record left unfulfilled
 * (`effectiveStatus` semantics: a record's `status`, defaulting to mandatory),
 * or an unmet per-instance group invariant (`groupInvariantErrors`, the
 * `requires.anyOf` at-least-one rule).
 *
 * Structural placeholder obligations (commodityType c-037, the two system
 * fields) are declared in the manifest but no page collects them, so they must
 * not mark an instance incomplete — otherwise every commodity line would read
 * incomplete (no `commodityType` value is ever stored).
 *
 * Known structural divergence: instances are inferred from leaf composite
 * prefixes, so a fully-EMPTY nested instance (a unit with no stored leaf)
 * vanishes on round-trip and its unmet `anyOf` cannot be flagged. A fully-empty
 * TOP-LEVEL entry is caught here via its unconditional mandatory field leaves.
 * See DESIGN-DELTA.md §12.
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

const STRUCTURAL_PLACEHOLDERS = new Set([
  'commodityType',
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
 * Per-instance completeness for the collection entry at `collectionPath[index]`.
 * True iff the evaluator finds no unsatisfied mandatory concern anywhere
 * beneath the instance.
 *
 * @param {object} answers - the nested answer POJO.
 * @param {Array<string|number>} collectionPath - a collection path.
 * @param {number} index - positional entry index within that collection.
 * @returns {boolean}
 */
export const entryComplete = (answers, collectionPath, index) => {
  const names = collectionPath.filter((segment) => typeof segment === 'string')
  const group = byAName.get(names[names.length - 1])
  if (!group) return true
  const instanceId = instanceFulfilmentId(collectionPath, index)
  const { obligations: implications, fulfilments } = evaluate(answers)

  for (const leaf of leavesUnder(group)) {
    if (STRUCTURAL_PLACEHOLDERS.has(leaf.name)) continue
    const implication = implications[leaf.id]
    if (!implication?.inScope) continue
    const stored = fulfilments[leaf.id]
    const belonging = (implication.records ?? []).filter((record) =>
      belongsToInstance(record.fulfilmentId, instanceId)
    )
    // An unconditional mandatory field leaf directly under this group is a
    // concern for the instance even when the evaluator enumerated no record —
    // an empty entry has no leaf storage, so the evaluator never sees the
    // instance, but the entry still shows and its mandatory fields are unfilled.
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
