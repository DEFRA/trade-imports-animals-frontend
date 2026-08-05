import { failProjection } from '../fail-projection.js'

export const addCollectionIndices = (collectionIndices, projection) => {
  for (const { indices } of projection.records) {
    projection.chain.forEach((group, depth) => {
      const byParent = collectionIndices.get(group) ?? new Map()
      collectionIndices.set(group, byParent)
      const parent = indices.slice(0, depth).join('/')
      const present = byParent.get(parent) ?? new Set()
      byParent.set(parent, present)
      present.add(indices[depth])
    })
  }
}

export const validateDenseIndices = (collectionIndices) => {
  for (const [group, byParent] of collectionIndices) {
    for (const [parent, present] of byParent) {
      const indices = [...present].sort((left, right) => left - right)
      const gap = indices.findIndex((index, position) => index !== position)
      if (gap !== -1) {
        const location = parent ? ` below ${parent}` : ''
        failProjection(
          `${group.name}${location} has sparse indices ` +
            `[${indices.join(', ')}]; expected consecutive indices from 0`
        )
      }
    }
  }
}
