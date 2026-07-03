import {
  containerStatus,
  FULFILLED,
  NOT_APPLICABLE
} from '../container-status.js'

const PAGE = 'page'

/**
 * The Resume / Continue primitive: status-filtered depth-first walk to
 * the first Page with status Not Started or In Progress
 * (obligations.md:1299-1305). Not Applicable and Fulfilled subtrees are
 * pruned wholesale — the status roll-up means a Fulfilled Group cannot
 * hide unfulfilled work. Null when everything is Fulfilled, so callers
 * can degrade to firstApplicablePage (the sectionEntry fallback).
 *
 * Implemented and tested although the journey renders no Resume widget —
 * parity forbids new hub chrome (the reduce is ledgered in the README).
 */
export const firstUnfulfilledPage = (root, evaluation, options = {}) => {
  if (root.kind) {
    const status = containerStatus(root, evaluation, options)
    if (status === NOT_APPLICABLE || status === FULFILLED) {
      return null
    }
    if (root.kind === PAGE) {
      return root
    }
  }
  for (const child of root.sections ?? root.children ?? []) {
    const found = firstUnfulfilledPage(child, evaluation, options)
    if (found) {
      return found
    }
  }
  return null
}
