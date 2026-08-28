import { INDEX_DELIMITER } from '../model/obligations/index-delimiter.js'

// Composite public shape: <obligationId>:<index>. The outer `:` marks the
// obligation/fulfilment index boundary; the inner `.` (INDEX_DELIMITER)
// separates the segments of the index itself.
export { INDEX_DELIMITER }
export const FULFILMENT_ID_DELIMITER = ':'

// EUDPA-333 groundwork: this pair encodes/decodes the composite public
// fulfilmentId used at URL boundaries and log correlation keys. There are
// no in-tree callers yet — landing them here so EUDPA-333 can consume them
// without re-opening this ticket. Boundary-hardening (input guards,
// trailing-delimiter normalisation, obligationId/index shape validation)
// is deliberately deferred until that wire-up has a real caller in view.
export const formatCompositeFulfilmentId = (obligationId, fulfilmentIndex) =>
  fulfilmentIndex
    ? `${obligationId}${FULFILMENT_ID_DELIMITER}${fulfilmentIndex}`
    : obligationId

export const parseCompositeFulfilmentId = (composite) => {
  const idx = composite.indexOf(FULFILMENT_ID_DELIMITER)
  return idx === -1
    ? { obligationId: composite, index: null }
    : {
        obligationId: composite.slice(0, idx),
        index: composite.slice(idx + 1)
      }
}

export const segmentsOf = (fulfilmentIndex) =>
  fulfilmentIndex.split(INDEX_DELIMITER)

const DIGIT = /\d/

const trailingDigitsOf = (segment) => {
  let start = segment.length
  while (start > 0 && DIGIT.test(segment[start - 1])) {
    start -= 1
  }
  return start === segment.length ? undefined : segment.slice(start)
}

export const hasIndexedSegments = (fulfilmentIndex) =>
  typeof fulfilmentIndex === 'string' &&
  fulfilmentIndex.length > 0 &&
  segmentsOf(fulfilmentIndex).every(
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

export const indicesOf = (fulfilmentIndex) =>
  segmentsOf(fulfilmentIndex).map((segment) =>
    Number(trailingDigitsOf(segment))
  )

export const compareIndexArrays = (left, right) => {
  const sharedDepth = Math.min(left.length, right.length)
  for (let depth = 0; depth < sharedDepth; depth++) {
    if (left[depth] !== right[depth]) {
      return left[depth] - right[depth]
    }
  }
  return left.length - right.length
}

export const formatFulfilmentIndex = (groups, indices) =>
  groups
    .map(({ token }, depth) => `${token}${indices[depth]}`)
    .join(INDEX_DELIMITER)

export const fulfilmentIndexInstance = (collectionPath, index, groups) =>
  formatFulfilmentIndex(groups, [
    ...collectionPath.filter((segment) => typeof segment === 'number'),
    index
  ])
