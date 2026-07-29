import { hasIndexedSegments, indicesOf, segmentsOf } from '../fulfilment-id.js'
import { failProjection } from './fail-projection.js'

export const validateFulfilmentId = (chain, fulfilmentId, name) => {
  if (!hasIndexedSegments(fulfilmentId)) {
    failProjection(
      `fulfilmentId "${String(
        fulfilmentId
      )}" for ${name} must have a trailing numeric index on every segment`
    )
  }

  const actualDepth = segmentsOf(fulfilmentId).length
  if (actualDepth !== chain.length) {
    failProjection(
      `fulfilmentId "${fulfilmentId}" for ${name} has depth ${actualDepth}; ` +
        `the within chain requires depth ${chain.length}`
    )
  }

  return indicesOf(fulfilmentId)
}

export const fulfilmentIdToPath = (chain, fulfilmentId, name) => {
  const indices = validateFulfilmentId(chain, fulfilmentId, name)
  const path = []
  chain.forEach((group, depth) => {
    path.push(group.name, indices[depth])
  })
  path.push(name)
  return path
}
