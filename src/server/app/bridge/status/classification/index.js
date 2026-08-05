import { effectiveStatus } from '../../../model/obligations/state-queries.js'
import { isAnswered } from '../../../lib/answered.js'
import { facetMembers, facetParent, isFacet } from '../facets.js'
import { obligationFor } from '../obligation-lookup.js'
import { structuralOf } from '../structure/index.js'

// --- classification -------------------------------------------------------

const isRequiredObligation = (o) =>
  Boolean(o?.required || o?.requiredAtLeastOne)
export const isCollection = (o) => Boolean(o?.collection)
export const partKey = (part) => (isFacet(part) ? part.collection : part)

// Top-level scalar requiredness comes from the evaluator's EFFECTIVE
// status — a retain-value gate (regionOfOriginCode) is in scope on both
// branches with a per-state mandatory/optional flip, so the static
// whenTrue heuristic would over-claim. Collections and flow-only parts
// keep the structural answer.
const scalarRequired = (part, state) => {
  const structural = structuralOf(part)
  if (structural?.collection) {
    return isRequiredObligation(structural)
  }
  const obligation = obligationFor(part)
  if (obligation && state) {
    return effectiveStatus(obligation, null, state) === 'mandatory'
  }
  return isRequiredObligation(structural)
}

// A facet is required if its parent collection is, or any facet member is.
const facetRequired = (part) =>
  isRequiredObligation(facetParent(part)) ||
  facetMembers(part).some(isRequiredObligation)

export const partRequired = (part, state) =>
  isFacet(part) ? facetRequired(part) : scalarRequired(part, state)

export const partStarted = (part, answers) => {
  if (!isFacet(part)) {
    return isAnswered(answers[part])
  }
  const members = facetMembers(part)
  return [answers[part.collection] ?? []]
    .flat()
    .some((entry) => members.some((member) => isAnswered(entry?.[member.id])))
}
