/**
 * Per-instance completeness -> collectionView's `complete`.
 *
 * collectionView reads positional storage for a collection's entries; this
 * module supplies the per-entry `complete` flag. entries / index / path stay
 * positional, so an empty or partial entry is never lost; only its completeness
 * comes from the evaluator.
 *
 * Instance identity is positional (the array index). `fulfilmentIndexInstance`
 * maps a positional entry to its fulfilment index with the segment machinery,
 * exactly as scope.js / purge.js convert fulfilment index <-> positional. The
 * per-instance verdict itself is owned by the obligations model — see
 * `model/obligations/instance-complete.js` for the completeness rules.
 *
 * Known structural divergence retained: a fully-EMPTY nested instance (a unit
 * with no stored leaf) vanishes on round-trip and its unmet `anyOf` cannot be
 * flagged. A fully-empty TOP-LEVEL entry is caught via its unconditional
 * mandatory field leaves.
 */

import { obligationByName } from '../model/obligations/manifest.js'
import { instanceComplete } from '../model/obligations/instance-complete.js'
import { ancestorChain } from './fulfilments/index.js'
import { fulfilmentIndexInstance } from './fulfilment-id.js'
import { fulfilmentRegistry } from './fulfilment-registry.js'

/**
 * Per-instance completeness for the collection entry at `collectionPath[index]`.
 * True iff the evaluator finds no unsatisfied mandatory concern anywhere
 * beneath the instance.
 *
 * @param {object} evaluation - the request-level evaluator result.
 * @param {Array<string|number>} collectionPath - a collection path.
 * @param {number} index - positional entry index within that collection.
 * @returns {boolean}
 */
export const entryComplete = (evaluation, collectionPath, index) => {
  const names = collectionPath.filter((segment) => typeof segment === 'string')
  const group = obligationByName(names.at(-1))
  if (!group) {
    return true
  }
  const groupChain = [...ancestorChain(group), group]
  const descriptors = groupChain.map(({ id }) =>
    fulfilmentRegistry.groupDescriptorOf(id)
  )
  const fulfilmentIndex = fulfilmentIndexInstance(
    collectionPath,
    index,
    descriptors
  )
  const state = {
    obligations: evaluation.obligations,
    fulfilments: evaluation.fulfilments
  }
  return instanceComplete(group, fulfilmentIndex, state)
}
