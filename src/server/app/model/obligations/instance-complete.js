/**
 * Per-instance completeness verdict.
 *
 * `instanceComplete(group, fulfilmentIndex, state)` returns true iff no
 * unsatisfied mandatory concern exists under the instance at
 * `fulfilmentIndex` — no unfilled mandatory leaf fulfilmentIndex beneath it, and
 * no unmet per-instance group invariant (`requires.anyOfIds`).
 *
 * Two mandatory-leaf shapes are recognised:
 *   - Leaves the evaluator enumerated for this instance (a fulfilmentIndex
 *     under the instance exists) — the stored value must be non-blank.
 *   - Direct-child leaves under the group with no conditional gate — the
 *     instance carries an implicit requirement to fill them, even when the
 *     evaluator did not enumerate a fulfilmentIndex for them (partially-filled
 *     instance where a mandatory field was never touched).
 *
 * Structural divergence retained from the previous implementation: a
 * fully-empty nested instance (positionally present but with zero leaf
 * storage) does not surface an unmet nested `anyOfIds` — no fulfilmentIndex
 * exists to attach the invariant error to. Top-level empty entries are caught via
 * the direct-child mandatory-leaf rule above.
 *
 * Lives outside `state-queries.js` because it enumerates leaves under the
 * group via the manifest graph, which needs a configured manifest. Keeping
 * it separate lets `state-queries.js` stay manifest-agnostic.
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

// A leaf's fulfilmentIndex belongs to the instance identified by
// `ancestorIndex` iff it IS `ancestorIndex` or sits beneath it — the same
// positional-prefix rule the evaluator uses.
const belongsToFulfilmentIndex = (childIndex, ancestorIndex) =>
  childIndex === ancestorIndex ||
  childIndex.startsWith(`${ancestorIndex}${INDEX_DELIMITER}`)

// Unconditional mandatory direct child leaf with no enumerated fulfilmentIndex
// for this instance — the instance still requires a value there.
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
 * True iff no unsatisfied mandatory concern exists under the instance at
 * `fulfilmentIndex`. See module comment for shape rules and the retained
 * structural divergence for fully-empty nested instances.
 *
 * @param {object} group - the collection obligation carrying the instance.
 * @param {string} fulfilmentIndex - the instance's composite path.
 * @param {EvaluatorState} state - `{ fulfilments, obligations }` as the
 *   evaluator returns.
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
