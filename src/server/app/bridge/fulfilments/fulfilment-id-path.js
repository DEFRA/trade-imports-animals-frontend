import { hasIndexedSegments, indicesOf, segmentsOf } from '../fulfilment-id.js'
import { failProjection } from './fail-projection.js'

export const validateFulfilmentIndex = (chain, fulfilmentIndex, name) => {
  if (!hasIndexedSegments(fulfilmentIndex)) {
    failProjection(
      `fulfilmentId "${String(
        fulfilmentIndex
      )}" for ${name} must have a trailing numeric index on every segment`
    )
  }

  const actualDepth = segmentsOf(fulfilmentIndex).length
  if (actualDepth !== chain.length) {
    failProjection(
      `fulfilmentId "${fulfilmentIndex}" for ${name} has depth ${actualDepth}; ` +
        `the within chain requires depth ${chain.length}`
    )
  }

  return indicesOf(fulfilmentIndex)
}

export const fulfilmentIndexToPath = (chain, fulfilmentIndex, name) => {
  const indices = validateFulfilmentIndex(chain, fulfilmentIndex, name)
  const path = []
  chain.forEach((group, depth) => {
    path.push(group.name, indices[depth])
  })
  path.push(name)
  return path
}
