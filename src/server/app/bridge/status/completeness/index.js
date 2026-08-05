import { groupInvariantErrors } from '../../../model/obligations/state-queries.js'
import { isCollection } from '../classification/index.js'
import { facetMemberFilter, facetParent, isFacet } from '../facets.js'
import { obligationFor } from '../obligation-lookup.js'
import { structuralOf } from '../structure/index.js'
import { childRecords } from './records.js'
import {
  leafFulfilledForRecord,
  leafInScopeForRecord,
  leafMandatoryForRecord,
  singletonFulfilled
} from './leaf.js'
import {
  collectionCapExceeded,
  emptyCollectionSatisfiesFloor,
  parentCountInvariantViolated
} from './invariants.js'

// --- completeness: the evaluator state ------------------------------------

// Every in-scope record complete, plus the requiredAtLeastOne floor,
// the collection cap and the per-parent count invariant.
// `memberFilter` applies only at THIS level (facet split); nested
// sub-collections recurse over all members.
const collectionSatisfied = (collection, parentRecId, memberFilter, state) => {
  const obligation = obligationFor(collection.id)
  if (!obligation) {
    return true
  }
  const records = childRecords(obligation, parentRecId, state)
  if (records.length === 0) {
    return emptyCollectionSatisfiesFloor(collection)
  }
  const invariantErrors = groupInvariantErrors(obligation, state)
  if (collectionCapExceeded(invariantErrors)) {
    return false
  }
  if (parentCountInvariantViolated(invariantErrors, parentRecId)) {
    return false
  }
  return records.every((rec) =>
    entrySatisfied(
      collection,
      rec.fulfilmentId,
      memberFilter,
      invariantErrors,
      state
    )
  )
}

const filteredMembers = (collection, memberFilter) =>
  memberFilter
    ? (collection.item ?? []).filter(memberFilter)
    : (collection.item ?? [])

// A member's own satisfaction: nested-collection recursion, out-of-scope
// pass, not-mandatory pass, or the fulfilment check.
const memberSatisfied = (member, recId, state) => {
  if (isCollection(member)) {
    return collectionSatisfied(member, recId, null, state)
  }
  if (!leafInScopeForRecord(member.id, recId, state)) {
    return true
  }
  if (!leafMandatoryForRecord(member.id, recId, state)) {
    return true
  }
  return leafFulfilledForRecord(member.id, recId, state)
}

// The model's per-record group-invariant verdict (the anyOfIds rule),
// then every filtered member. MIN_ENTRIES errors carry no instanceId, so
// only per-record violations bite here.
const entrySatisfied = (
  collection,
  recId,
  memberFilter,
  invariantErrors,
  state
) => {
  if (invariantErrors.some((error) => error.instanceId === recId)) {
    return false
  }
  return filteredMembers(collection, memberFilter).every((member) =>
    memberSatisfied(member, recId, state)
  )
}

export const partSatisfied = (part, answers, state) => {
  if (isFacet(part)) {
    return collectionSatisfied(
      facetParent(part),
      null,
      facetMemberFilter(part),
      state
    )
  }
  const obligation = structuralOf(part)
  if (isCollection(obligation)) {
    return collectionSatisfied(obligation, null, null, state)
  }
  return singletonFulfilled(part, answers, state)
}
