import { containerApplies, journeyFlowConditions } from '../applies-when.js'

const PAGE_KIND = 'page'

/**
 * Status-blind rooted depth-first walk to the first Page in declared
 * order (obligations.md:1295-1297). Read-only and Fulfilled Pages are
 * included — they are part of the narrative; only the appliesWhen gate
 * filters. Used for default Section entry. Rootable at the Flow, a
 * Section or a SubSection; null when nothing applies.
 */
export function firstApplicablePage(root, evaluation, options = {}) {
  const { conditions = journeyFlowConditions } = options
  if (!containerApplies(root, evaluation, conditions)) {
    return null
  }
  if (root.kind === PAGE_KIND) {
    return root
  }
  for (const child of root.sections ?? root.children ?? []) {
    const found = firstApplicablePage(child, evaluation, options)
    if (found) {
      return found
    }
  }
  return null
}
