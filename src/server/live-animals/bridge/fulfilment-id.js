export const segmentsOf = (fulfilmentId) => fulfilmentId.split('/')

export const hasIndexedSegments = (fulfilmentId) =>
  typeof fulfilmentId === 'string' &&
  fulfilmentId.length > 0 &&
  segmentsOf(fulfilmentId).every(
    (segment) => segment.length > 0 && /\d+$/.test(segment)
  )

export const depthOf = (obligation) => {
  let depth = 0
  let ancestor = obligation.within
  while (ancestor) {
    depth += 1
    ancestor = ancestor.within
  }
  return depth
}

export const indicesOf = (fulfilmentId) =>
  segmentsOf(fulfilmentId).map((segment) => Number(segment.match(/\d+$/)?.[0]))

export const formatFulfilmentId = (groups, indices) =>
  groups.map(({ token }, depth) => `${token}${indices[depth]}`).join('/')

export const instanceFulfilmentId = (collectionPath, index, groups) =>
  formatFulfilmentId(groups, [
    ...collectionPath.filter((segment) => typeof segment === 'number'),
    index
  ])
