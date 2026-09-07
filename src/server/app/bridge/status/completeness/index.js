import { groupInvariantErrors } from '../../../model/obligations/state-queries.js'
import { isCollection } from '../classification/index.js'
import { facetMemberFilter, facetParent, isFacet } from '../facets.js'
import { obligationFor } from '../obligation-lookup.js'
import { structuralOf } from '../structure/index.js'
import { childFulfilmentIndexes } from './records.js'
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
const collectionSatisfied = (
  collection,
  parentFulfilmentIndex,
  memberFilter,
  state
) => {
  const obligation = obligationFor(collection.id)
  if (!obligation) {
    return true
  }
  const fulfilmentIndexes = childFulfilmentIndexes(
    obligation,
    parentFulfilmentIndex,
    state
  )
  if (fulfilmentIndexes.length === 0) {
    return emptyCollectionSatisfiesFloor(collection)
  }
  const invariantErrors = groupInvariantErrors(obligation, state)
  if (collectionCapExceeded(invariantErrors)) {
    return false
  }
  if (parentCountInvariantViolated(invariantErrors, parentFulfilmentIndex)) {
    return false
  }
  return fulfilmentIndexes.every((fulfilmentIndex) =>
    entrySatisfied(
      collection,
      fulfilmentIndex,
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
const memberSatisfied = (member, fulfilmentIndex, state) => {
  if (isCollection(member)) {
    return collectionSatisfied(member, fulfilmentIndex, null, state)
  }
  if (!leafInScopeForRecord(member.id, fulfilmentIndex, state)) {
    return true
  }
  if (!leafMandatoryForRecord(member.id, fulfilmentIndex, state)) {
    return true
  }
  return leafFulfilledForRecord(member.id, fulfilmentIndex, state)
}

// The model's per-record group-invariant verdict (the anyOfIds rule),
// then every filtered member. MIN_ENTRIES errors carry no fulfilmentIndex,
// so only per-record violations bite here.
const entrySatisfied = (
  collection,
  fulfilmentIndex,
  memberFilter,
  invariantErrors,
  state
) => {
  if (
    invariantErrors.some((error) => error.fulfilmentIndex === fulfilmentIndex)
  ) {
    return false
  }
  return filteredMembers(collection, memberFilter).every((member) =>
    memberSatisfied(member, fulfilmentIndex, state)
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
