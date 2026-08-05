import { groups } from '../../model/obligations/manifest.js'

export const groupObligations = {
  has: (obligation) => groups().includes(obligation)
}

// Ancestor groups from root down to immediate parent (excluding self).
export const ancestorChain = (obligation) => {
  const chain = []
  let cur = obligation.within
  while (cur) {
    chain.unshift(cur)
    cur = cur.within
  }
  return chain
}
