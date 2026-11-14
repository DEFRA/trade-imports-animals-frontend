import { obligationByName } from '../model/obligations/manifest.js'
import { ancestorChain } from '../model/obligations/manifest-graph.js'
import { instanceComplete } from '../model/obligations/instance-complete.js'
import { fulfilmentIndexInstance } from './fulfilment-id.js'
import { fulfilmentRegistry } from './fulfilment-registry.js'
import { emptyCollectionShortOfFloor } from './status/completeness/invariants.js'
import { obligationFor } from './status/obligation-lookup.js'
import { structuralOf } from './status/structure/index.js'

const collectionNameOf = (collectionPath) =>
  collectionPath.filter((segment) => typeof segment === 'string').at(-1)

const entryFulfilmentIndex = (group, collectionPath, index) =>
  fulfilmentIndexInstance(
    collectionPath,
    index,
    [...ancestorChain(group), group].map(({ id }) =>
      fulfilmentRegistry.groupDescriptorOf(id)
    )
  )

const evaluatorStateOf = (evaluation) => ({
  obligations: evaluation.obligations,
  fulfilments: evaluation.fulfilments
})

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
  const group = obligationByName(collectionNameOf(collectionPath))
  if (!group) {
    return true
  }
  return instanceComplete(
    group,
    entryFulfilmentIndex(group, collectionPath, index),
    evaluatorStateOf(evaluation)
  )
}

/**
 * Whether the collection entry at `collectionPath[index]` is asked for a record
 * of the nested collection `nestedCollectionName` and holds none.
 *
 * @param {object} evaluation - the request-level evaluator result.
 * @param {Array<string|number>} collectionPath - the parent collection's path.
 * @param {number} index - positional entry index within the parent collection.
 * @param {string} nestedCollectionName - the collection nested under the entry.
 * @returns {boolean} true iff the nested collection's floor asks the entry for
 * a record and none is stored.
 */
export const entryOwesNestedRecord = (
  evaluation,
  collectionPath,
  index,
  nestedCollectionName
) => {
  const parent = obligationByName(collectionNameOf(collectionPath))
  const nestedCollection = structuralOf(nestedCollectionName)
  const nested = obligationFor(nestedCollection?.id)
  if (!parent || !nested) {
    return false
  }
  return emptyCollectionShortOfFloor(
    nestedCollection,
    nested,
    entryFulfilmentIndex(parent, collectionPath, index),
    evaluatorStateOf(evaluation)
  )
}
