/**
 * Pure walks over the obligation manifest — the structural relationships
 * between obligations (within chains, group membership, leaves under
 * groups). No runtime state, no fulfilments, no evaluator output. Reads
 * only from `manifest.js`.
 *
 * Single home for these helpers. Bridge callers import directly from
 * here; there is no bridge-side re-export.
 */

import { obligations, groups } from './manifest.js'

/**
 * The chain of ancestor groups from root down to immediate parent,
 * excluding the obligation itself.
 */
export const ancestorChain = (obligation) => {
  const chain = []
  let cur = obligation.within
  while (cur) {
    chain.unshift(cur)
    cur = cur.within
  }
  return chain
}

/**
 * True iff the obligation is a group (any other obligation references
 * it via `within`).
 */
export const isGroup = (obligation) => groups().includes(obligation)

/**
 * All leaf obligations whose ancestor chain includes the given group.
 */
export const leavesUnder = (group) =>
  obligations().filter(
    (obligation) =>
      !isGroup(obligation) && ancestorChain(obligation).includes(group)
  )

/**
 * The group itself plus every group nested beneath it.
 */
export const groupsFrom = (group) =>
  obligations().filter(
    (obligation) =>
      isGroup(obligation) &&
      (obligation === group || ancestorChain(obligation).includes(group))
  )
