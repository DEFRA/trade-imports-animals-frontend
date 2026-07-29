import { obligations } from '../../../model/obligations/obligations.js'
import { validateFulfilmentId } from '../fulfilment-id-path.js'
import { ancestorChain, groupObligations } from '../obligation-graph.js'
import { addCollectionIndices, validateDenseIndices } from './dense-indices.js'

export const compareIndices = (left, right) => {
  const sharedDepth = Math.min(left.indices.length, right.indices.length)
  for (let depth = 0; depth < sharedDepth; depth++) {
    if (left.indices[depth] !== right.indices[depth]) {
      return left.indices[depth] - right.indices[depth]
    }
  }
  return left.indices.length - right.indices.length
}

export const recordProjectionOf = (obligation, stored) => {
  const chain = ancestorChain(obligation)
  return {
    obligation,
    chain,
    records: Object.entries(stored)
      .map(([fulfilmentId, value]) => ({
        fulfilmentId,
        indices: validateFulfilmentId(chain, fulfilmentId, obligation.name),
        value
      }))
      .sort(compareIndices)
  }
}

export const projectionsOf = (fulfilments) => {
  const projections = new Map()
  const collectionIndices = new Map()

  for (const obligation of obligations) {
    if (groupObligations.has(obligation)) continue
    const stored = fulfilments?.[obligation.id]
    if (stored === undefined || !obligation.within) continue
    const projection = recordProjectionOf(obligation, stored)
    projections.set(obligation, projection)
    addCollectionIndices(collectionIndices, projection)
  }

  validateDenseIndices(collectionIndices)
  return projections
}
