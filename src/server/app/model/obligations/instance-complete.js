/**
 * `instanceComplete(group, fulfilmentIndex, state)` — true iff no
 * unsatisfied mandatory concern exists under the instance:
 *   - no mandatory leaf under the instance is unfilled, either because
 *     the evaluator enumerated a fulfilmentIndex for it that lacks a
 *     stored value, or because it's a direct-child mandatory leaf with
 *     no conditional gate and no enumerated fulfilmentIndex at all;
 *   - no per-instance group invariant (`requires.anyOfIds`) fires under
 *     the instance.
 *
 * Retained divergence: a fully-empty NESTED instance (positionally
 * present but with zero leaf storage) does not surface an unmet nested
 * `anyOfIds` — no fulfilmentIndex exists to attach the invariant error
 * to. Top-level empty entries are caught by the direct-child mandatory
 * rule above.
 *
 * Lives outside `state-queries.js` because it walks leaves under the
 * group via the manifest graph, which needs a configured manifest.
 * Keeping it separate lets `state-queries.js` stay manifest-agnostic.
 */

import { INDEX_DELIMITER } from './index-delimiter.js'
import { leavesUnder, groupsFrom } from './manifest-graph.js'
import {
  effectiveStatus,
  groupInvariantErrors,
  leafSatisfied
} from './state-queries.js'

// `Record<K, V>` below is TypeScript's built-in utility type.

/**
 * @typedef {object} EvaluatorState
 * @property {Record<string, unknown>} fulfilments - the stored fulfilments
 *   keyed by obligation id (indexed obligations carry an inner map keyed by
 *   fulfilmentIndex; unindexed obligations carry a single stored value).
 * @property {Record<string, {inScope: boolean, status?: string, fulfilmentIndexes?: string[], reasons?: object[]}>} obligations
 *   - the implication for each obligation.
 */

// True iff `childIndex` IS `ancestorIndex` or sits beneath it — the same
// positional-prefix rule the evaluator uses.
const belongsToFulfilmentIndex = (childIndex, ancestorIndex) =>
  childIndex === ancestorIndex ||
  childIndex.startsWith(`${ancestorIndex}${INDEX_DELIMITER}`)

// Unconditional mandatory direct-child leaf that the evaluator did not
// enumerate for this instance — the instance still requires a value.
const directChildRequirementUnmet = (leaf, group, fulfilmentIndex, state) => {
  if (leaf.within !== group || leaf.applyTo) {
    return false
  }
  if ((leaf.status ?? 'mandatory') !== 'mandatory') {
    return false
  }
  return !leafSatisfied(leaf, fulfilmentIndex, state)
}

const anyUnfilledUnderInstance = (
  fulfilmentIndexesUnderInstance,
  leaf,
  state
) =>
  fulfilmentIndexesUnderInstance.some(
    (fulfilmentIndex) =>
      effectiveStatus(leaf, fulfilmentIndex, state) === 'mandatory' &&
      !leafSatisfied(leaf, fulfilmentIndex, state)
  )

const leafBlocksInstance = (leaf, group, fulfilmentIndex, state) => {
  const implication = state.obligations?.[leaf.id]
  if (!implication?.inScope) {
    return false
  }
  const fulfilmentIndexesUnderInstance = (
    implication.fulfilmentIndexes ?? []
  ).filter((leafFulfilmentIndex) =>
    belongsToFulfilmentIndex(leafFulfilmentIndex, fulfilmentIndex)
  )
  if (fulfilmentIndexesUnderInstance.length === 0) {
    return directChildRequirementUnmet(leaf, group, fulfilmentIndex, state)
  }
  return anyUnfilledUnderInstance(fulfilmentIndexesUnderInstance, leaf, state)
}

const groupInvariantBlocksInstance = (group, fulfilmentIndex, state) =>
  groupsFrom(group).some(
    (nestedGroup) =>
      nestedGroup.requires?.anyOfIds &&
      groupInvariantErrors(nestedGroup, state).some(
        (error) =>
          error.fulfilmentIndex &&
          belongsToFulfilmentIndex(error.fulfilmentIndex, fulfilmentIndex)
      )
  )

/**
 * @param {object} group - the collection obligation carrying the instance.
 * @param {string} fulfilmentIndex - the instance's composite path.
 * @param {EvaluatorState} state - `{ fulfilments, obligations }`.
 * @returns {boolean}
 */
export const instanceComplete = (group, fulfilmentIndex, state) => {
  const blockedByLeaf = leavesUnder(group).some((leaf) =>
    leafBlocksInstance(leaf, group, fulfilmentIndex, state)
  )
  if (blockedByLeaf) {
    return false
  }
  return !groupInvariantBlocksInstance(group, fulfilmentIndex, state)
}
