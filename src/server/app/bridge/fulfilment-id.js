import { INDEX_DELIMITER } from '../model/obligations/index-delimiter.js'

// Fulfilment indexes are dot-delimited strings whose segments each identify
// one enclosing group instance (`line0`, `line0.unit1`, ...).
export { INDEX_DELIMITER }

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
