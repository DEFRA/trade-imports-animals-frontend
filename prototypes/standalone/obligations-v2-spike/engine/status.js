import { collectsOf } from '../flow/dispatch.js'
import { nonQuoteSections } from '../flow/flow.js'
import { registry } from '../registry.js'
import { isAnswered } from './util.js'

/**
 * The four-status roll-up (v1's taxonomy, kept). Pure and page-agnostic:
 * the hub calls it per section; nothing here renders. Status is computed
 * over a set of obligation ids and the scope the state layer produced.
 *
 *  - Not Applicable — none of the ids are in scope
 *  - Fulfilled      — every in-scope REQUIRED id is answered
 *                     (a section owing nothing required is vacuously Fulfilled)
 *  - In Progress    — some answered, but a required one is still missing
 *  - Not Started    — in scope, nothing answered yet
 */
export const NA = 'not-applicable'
export const NOT_STARTED = 'not-started'
export const IN_PROGRESS = 'in-progress'
export const FULFILLED = 'fulfilled'

const isRequired = (id) => {
  const o = registry.byId(id)
  return Boolean(o?.required || o?.requiredAtLeastOne)
}

export function statusOf(obligationIds, answers, inScope) {
  const inScopeIds = obligationIds.filter((id) => inScope.has(id))
  if (inScopeIds.length === 0) return NA

  const required = inScopeIds.filter(isRequired)
  if (required.length === 0) return FULFILLED

  const allRequiredAnswered = required.every((id) => isAnswered(answers[id]))
  if (allRequiredAnswered) return FULFILLED
  return inScopeIds.some((id) => isAnswered(answers[id]))
    ? IN_PROGRESS
    : NOT_STARTED
}

/** Union of every obligation the section's pages collect. */
export const sectionObligationIds = (section) =>
  section.pages.flatMap((page) => collectsOf(page.id))

export const sectionStatus = (section, answers, inScope) =>
  statusOf(sectionObligationIds(section), answers, inScope)

/** The quote unlocks once every other section is Fulfilled or Not Applicable. */
export const readyForQuote = (answers, inScope) =>
  nonQuoteSections.every((section) => {
    const status = sectionStatus(section, answers, inScope)
    return status === FULFILLED || status === NA
  })
