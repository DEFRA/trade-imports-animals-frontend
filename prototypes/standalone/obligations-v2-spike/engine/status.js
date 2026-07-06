import { registry } from '../registry.js'
import { isAnswered } from '../lib/answered.js'
import { satisfied } from './complete.js'

/**
 * The four-status roll-up (v1's taxonomy, kept). Pure and page-agnostic:
 * the hub calls it per section; nothing here renders. Status is computed
 * over a set of obligation ids and the scope the state layer produced.
 *
 *  - Not Applicable — none of the ids are in scope
 *  - Fulfilled      — every in-scope REQUIRED id is satisfied
 *                     (a section owing nothing required is vacuously Fulfilled)
 *  - In Progress    — some answered, but a required one is still missing
 *  - Not Started    — in scope, nothing answered yet
 *
 * Engine-pure: imports only `registry`, `lib/answered` and the sibling
 * `complete.js` — ZERO `flow/` imports. The flow-aware section roll-up
 * (`sectionStatus` / `readyForQuote`) lives in `flow/section-status.js`.
 */
export const NA = 'not-applicable'
export const NOT_STARTED = 'not-started'
export const IN_PROGRESS = 'in-progress'
export const FULFILLED = 'fulfilled'

const isRequired = (id) => {
  const o = registry.byId(id)
  return Boolean(o?.required || o?.requiredAtLeastOne)
}

/** "Has any progress been made on this obligation?" — the In Progress vs Not
 * Started split, deliberately WEAKER than `satisfied`. A scalar is started once
 * answered; a COLLECTION is started once it holds ≥1 entry, even an INCOMPLETE
 * one (`isAnswered` treats a non-empty array as answered). Using `satisfied`
 * here instead would misreport a section whose only obligation is a
 * partially-filled collection — e.g. the named-driver section, which collects
 * just `drivers` — as Not Started despite holding several drivers, because the
 * collection is not yet fully complete and there is no other answered scalar to
 * carry the section. Started ≠ satisfied is exactly that distinction. */
const isStarted = (id, answers) => isAnswered(answers[id])

export function statusOf(obligationIds, answers, inScope) {
  const inScopeIds = obligationIds.filter((id) => inScope.has(id))
  if (inScopeIds.length === 0) return NA

  const required = inScopeIds.filter(isRequired)
  if (required.length === 0) return FULFILLED

  const allRequiredSatisfied = required.every((id) => satisfied(id, answers))
  if (allRequiredSatisfied) return FULFILLED
  return inScopeIds.some((id) => isStarted(id, answers))
    ? IN_PROGRESS
    : NOT_STARTED
}
