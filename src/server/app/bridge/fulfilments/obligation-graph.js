import { obligations } from '../../model/obligations/obligations.js'

export const groupObligations = new Set(
  obligations.filter((obligation) =>
    obligations.some((other) => other.within === obligation)
  )
)

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
