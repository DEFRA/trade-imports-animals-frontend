// Composite public shape: <obligationId>:<index>. The outer `:` marks the
// obligation/fulfilment boundary; the inner `.` (see INDEX_DELIMITER)
// separates the segments of the index itself.
export const INDEX_DELIMITER = '.'
export const FULFILMENT_ID_DELIMITER = ':'

export const formatCompositeFulfilmentId = (obligationId, index) =>
  index ? `${obligationId}${FULFILMENT_ID_DELIMITER}${index}` : obligationId

export const parseCompositeFulfilmentId = (composite) => {
  const idx = composite.indexOf(FULFILMENT_ID_DELIMITER)
  return idx === -1
    ? { obligationId: composite, index: null }
    : {
        obligationId: composite.slice(0, idx),
        index: composite.slice(idx + 1)
      }
}

export const segmentsOf = (fulfilmentId) => fulfilmentId.split(INDEX_DELIMITER)

const DIGIT = /\d/

const trailingDigitsOf = (segment) => {
  let start = segment.length
  while (start > 0 && DIGIT.test(segment[start - 1])) {
    start -= 1
  }
  return start === segment.length ? undefined : segment.slice(start)
}

export const hasIndexedSegments = (fulfilmentId) =>
  typeof fulfilmentId === 'string' &&
  fulfilmentId.length > 0 &&
  segmentsOf(fulfilmentId).every(
    (segment) => segment.length > 0 && DIGIT.test(segment.at(-1))
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
  segmentsOf(fulfilmentId).map((segment) => Number(trailingDigitsOf(segment)))

export const compareIndexArrays = (left, right) => {
  const sharedDepth = Math.min(left.length, right.length)
  for (let depth = 0; depth < sharedDepth; depth++) {
    if (left[depth] !== right[depth]) {
      return left[depth] - right[depth]
    }
  }
  return left.length - right.length
}

export const formatFulfilmentId = (groups, indices) =>
  groups
    .map(({ token }, depth) => `${token}${indices[depth]}`)
    .join(INDEX_DELIMITER)

export const instanceFulfilmentId = (collectionPath, index, groups) =>
  formatFulfilmentId(groups, [
    ...collectionPath.filter((segment) => typeof segment === 'number'),
    index
  ])
