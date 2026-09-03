import { obligations } from '../../../model/obligations/manifest.js'
import { compareIndexArrays } from '../../fulfilment-id.js'
import { validateFulfilmentIndex } from '../fulfilment-index-path.js'
import {
  ancestorChain,
  isGroup
} from '../../../model/obligations/manifest-graph.js'
import { addCollectionIndices, validateDenseIndices } from './dense-indices.js'

export const recordProjectionOf = (obligation, stored) => {
  const chain = ancestorChain(obligation)
  return {
    obligation,
    chain,
    records: Object.entries(stored)
      .map(([fulfilmentIndex, value]) => ({
        fulfilmentIndex,
        indices: validateFulfilmentIndex(
          chain,
          fulfilmentIndex,
          obligation.name
        ),
        value
      }))
      .sort((a, b) => compareIndexArrays(a.indices, b.indices))
  }
}

export const projectionsOf = (fulfilments) => {
  const projections = new Map()
  const collectionIndices = new Map()

  for (const obligation of obligations()) {
    const stored = fulfilments?.[obligation.id]
    if (isGroup(obligation) || stored === undefined || !obligation.within) {
      continue
    }
    const projection = recordProjectionOf(obligation, stored)
    projections.set(obligation, projection)
    addCollectionIndices(collectionIndices, projection)
  }

  validateDenseIndices(collectionIndices)
  return projections
}
