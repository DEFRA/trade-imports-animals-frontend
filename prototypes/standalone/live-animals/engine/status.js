import { registry } from '../registry.js'
import { isAnswered } from '../lib/answered.js'
import { satisfied } from './evaluate/complete.js'

export const NA = 'not-applicable'
export const NOT_STARTED = 'not-started'
export const IN_PROGRESS = 'in-progress'
export const FULFILLED = 'fulfilled'
export const OPTIONAL = 'optional'

const isRequired = (id) => {
  const obligation = registry.byId(id)
  return Boolean(obligation?.required || obligation?.requiredAtLeastOne)
}

/** Deliberately WEAKER than `satisfied`: a collection is started once it holds
 * ≥1 entry, even an incomplete one. Using `satisfied` here would misreport a
 * section whose only obligation is a partially-filled collection as Not
 * Started. */
const isStarted = (id, answers) => isAnswered(answers[id])

export const statusOf = (obligationIds, answers, inScope) => {
  const inScopeIds = obligationIds.filter((id) => inScope.has(id))
  if (inScopeIds.length === 0) return NA

  const required = inScopeIds.filter(isRequired)
  // A section owing nothing required is OPTIONAL until it is touched: unstarted
  // it reads Optional (and does not count towards "X of N"); once ≥1 answer
  // exists it tracks completeness like any other section.
  if (required.length === 0) {
    const started = inScopeIds.some((id) => isStarted(id, answers))
    if (!started) return OPTIONAL
    return inScopeIds.every((id) => satisfied(id, answers))
      ? FULFILLED
      : IN_PROGRESS
  }

  const allRequiredSatisfied = required.every((id) => satisfied(id, answers))
  if (allRequiredSatisfied) return FULFILLED
  return inScopeIds.some((id) => isStarted(id, answers))
    ? IN_PROGRESS
    : NOT_STARTED
}
