/**
 * Pure walks over the obligation manifest — structural relationships
 * (within chains, group membership, leaves under groups). No runtime
 * state; reads only from `manifest.js`.
 */

import { obligations, groups } from './manifest.js'

// Root down to immediate parent; excludes the obligation itself.
export const ancestorChain = (obligation) => {
  const chain = []
  let cur = obligation.within
  while (cur) {
    chain.unshift(cur)
    cur = cur.within
  }
  return chain
}

// A group is any obligation that some other obligation references via `within`.
export const isGroup = (obligation) => groups().includes(obligation)

export const leavesUnder = (group) =>
  obligations().filter(
    (obligation) =>
      !isGroup(obligation) && ancestorChain(obligation).includes(group)
  )

// Includes `group` itself as well as every nested group.
export const groupsFrom = (group) =>
  obligations().filter(
    (obligation) =>
      isGroup(obligation) &&
      (obligation === group || ancestorChain(obligation).includes(group))
  )
