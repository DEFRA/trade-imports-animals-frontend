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

const isStarted = (id, answers) => isAnswered(answers[id])

export const statusOf = (obligationIds, answers, inScope) => {
  const inScopeIds = obligationIds.filter((id) => inScope.has(id))
  if (inScopeIds.length === 0) return NA

  const required = inScopeIds.filter(isRequired)
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
