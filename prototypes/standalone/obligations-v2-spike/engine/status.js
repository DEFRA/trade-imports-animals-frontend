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

/** One entry of a collection is COMPLETE when every required sub-obligation in
 * the item is satisfied — the per-item completeness fact the model gained in 6a,
 * now DEPTH-AWARE (6b): a sub-obligation that is itself a collection defers to
 * `collectionComplete`, which enforces "any entry that EXISTS must be complete"
 * and, when `requiredAtLeastOne`, also "≥1 entry". So a driver holding a
 * half-entered nested claim is not complete, whether or not its claims are
 * mandated — the mandate governs only whether ZERO entries is acceptable. */
export const entryComplete = (def, entry) =>
  (def.item ?? []).every((sub) =>
    sub.collection
      ? collectionComplete(sub, entry?.[sub.id])
      : !sub.required || isAnswered(entry?.[sub.id])
  )

/** A collection is SATISFIED when it meets its cardinality mandate AND every
 * entry is complete — not merely "≥1 entry exists" (DISCUSSION-LOG entry 6,
 * finding 4). A blank-required-field claim no longer counts the section done. */
export const collectionComplete = (def, value) => {
  const entries = value ?? []
  if (def.requiredAtLeastOne && entries.length === 0) return false
  return entries.every((entry) => entryComplete(def, entry))
}

/** "Is this obligation's mandate met?" — a collection descends into its items;
 * a scalar is just answered/not. The one place completeness knows about depth. */
const satisfied = (id, answers) => {
  const def = registry.byId(id)
  return def?.collection
    ? collectionComplete(def, answers[id])
    : isAnswered(answers[id])
}

export function statusOf(obligationIds, answers, inScope) {
  const inScopeIds = obligationIds.filter((id) => inScope.has(id))
  if (inScopeIds.length === 0) return NA

  const required = inScopeIds.filter(isRequired)
  if (required.length === 0) return FULFILLED

  const allRequiredAnswered = required.every((id) => satisfied(id, answers))
  if (allRequiredAnswered) return FULFILLED
  return inScopeIds.some((id) => satisfied(id, answers))
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
