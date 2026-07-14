import { registry } from '../registry.js'
import { isAnswered } from '../lib/answered.js'
import { collectionComplete, satisfied } from './evaluate/complete.js'

export const NA = 'not-applicable'
export const NOT_STARTED = 'not-started'
export const IN_PROGRESS = 'in-progress'
export const FULFILLED = 'fulfilled'
export const OPTIONAL = 'optional'

const isFacet = (part) => typeof part !== 'string'

const facetParent = (part) => registry.byId(part.collection)

const facetMemberFilter = (part) =>
  part.only
    ? (member) => part.only.includes(member.id)
    : (member) => !part.except.includes(member.id)

const facetMembers = (part) =>
  (facetParent(part).item ?? []).filter(facetMemberFilter(part))

const isRequiredObligation = (obligation) =>
  Boolean(obligation?.required || obligation?.requiredAtLeastOne)

const partKey = (part) => (isFacet(part) ? part.collection : part)

const partRequired = (part) => {
  if (!isFacet(part)) return isRequiredObligation(registry.byId(part))
  return (
    isRequiredObligation(facetParent(part)) ||
    facetMembers(part).some(isRequiredObligation)
  )
}

const partStarted = (part, answers) => {
  if (!isFacet(part)) return isAnswered(answers[part])
  const members = facetMembers(part)
  return []
    .concat(answers[part.collection] ?? [])
    .some((entry) => members.some((member) => isAnswered(entry?.[member.id])))
}

const partSatisfied = (part, answers) => {
  if (!isFacet(part)) return satisfied(part, answers)
  const parent = facetParent(part)
  return collectionComplete(
    parent,
    answers[parent.id],
    {
      answers,
      basePath: [parent.id],
      enclosingFrames: [{ framePath: [], siblings: registry.all }]
    },
    facetMemberFilter(part)
  )
}

export const statusOf = (parts, answers, inScope) => {
  const inScopeParts = parts.filter((part) => inScope.has(partKey(part)))
  if (inScopeParts.length === 0) return NA

  const required = inScopeParts.filter(partRequired)
  if (required.length === 0) {
    const started = inScopeParts.some((part) => partStarted(part, answers))
    if (!started) return OPTIONAL
    return inScopeParts.every((part) => partSatisfied(part, answers))
      ? FULFILLED
      : IN_PROGRESS
  }

  const allRequiredSatisfied = required.every((part) =>
    partSatisfied(part, answers)
  )
  if (allRequiredSatisfied) return FULFILLED
  return inScopeParts.some((part) => partStarted(part, answers))
    ? IN_PROGRESS
    : NOT_STARTED
}
