/**
 * Project the obligation implications into the 5-way task/section status.
 *
 * `statusOf(parts, answers, inScope, evaluation)` is the sole runtime source
 * of the 5-way task/section status at the row/section callers (`flow/task-rows.js`
 * `rowStatus`, `flow/section-status.js` `sectionStatus`;
 * `readyForCheckYourAnswers` rolls up through the former).
 *
 * The OUTER classification branches on NA / OPTIONAL / NOT_STARTED /
 * IN_PROGRESS / FULFILLED via `partRequired` / `partStarted` — so the
 * presentation-facing edge cases (empty optional collection -> OPTIONAL,
 * partial optional -> IN_PROGRESS, empty required collection -> NOT_STARTED)
 * hold. Row/section STRUCTURE (which parts, facet membership, the collection
 * floor, the any-of rule) is sourced from the manifest, projected into the
 * status object shape by `toStructural` below.
 *
 * `partSatisfied` — the completeness judgement — walks the collection tree and
 * sources three things from the evaluator state:
 *
 *   - per-record SCOPE   — a leaf is present for a record iff the implication
 *                          `records[]` carries that record's fulfilmentId
 *                          (post-purge membership).
 *   - per-record MANDATE  — `effectiveStatus(leaf, recId, state)` (mandatory /
 *                          optional per record).
 *   - FULFILMENT          — `domainEntry.isComplete` for addresses, else
 *                          `!isBlankValue` (incl. partial-address handling).
 *
 * The empty-collection floor is manifest-sourced (`requiredAtLeastOne`:
 * `requires.minEntries` or `requires.anyOfIds`) and stays a presentation
 * rule — the model emits nothing for a group with zero records, but an
 * empty required collection must still block FULFILLED. The per-record
 * any-of verdict is sourced from the model's `groupInvariantErrors`
 * (filtered by instanceId), the same interpreter collection-complete
 * uses.
 */

import { obligations, groups } from '../model/obligations/obligations.js'
import {
  effectiveStatus,
  groupInvariantErrors
} from '../model/obligations/state-queries.js'
import { isBlankValue } from '../model/obligations/is-blank-value.js'
import { domain } from '../model/domain/index.js'
import { isAnswered } from '../lib/answered.js'
import { SYSTEM_POPULATED } from '../flow/obligation-source.js'

export const NA = 'not-applicable'
export const NOT_STARTED = 'not-started'
export const IN_PROGRESS = 'in-progress'
export const FULFILLED = 'fulfilled'
export const OPTIONAL = 'optional'

const obligationByName = new Map(
  obligations.map((obligation) => [obligation.name, obligation])
)
const obligationFor = (name) => obligationByName.get(name)

// --- structure: the manifest, projected into the status object shape ------
//
// The row/section STRUCTURE (which parts, facet membership, the collection
// floor, the any-of rule) is sourced from the obligations/groups exports and
// exposed under the object shape the classification below reads:
//   .id                → `name`
//   .collection        → obligation is a `within` group
//   .required          → `status: 'mandatory'`
//   .requiredAtLeastOne→ `requires.minEntries` OR `requires.anyOfIds`
//                        (the animalIdentifiers floor is a per-unit any-of)
//   .item              → obligations whose `within` is this group

const isGroup = (obligation) => groups.includes(obligation)

// Collection members for status = the group's `within` obligations MINUS the
// system-populated placeholders that no page collects — the same exclusion
// `flow/dispatch.js` applies when indexing pages to obligations.
const membersOf = (group) =>
  obligations.filter(
    (obligation) =>
      obligation.within === group && !SYSTEM_POPULATED.has(obligation.name)
  )

// Structural mandatory-when-in-scope fallback: a static `status:
// 'mandatory'`, or a conditional gate whose whenTrue branch is mandatory
// (commercial/privateTransporter, purposeInInternalMarket, cph,
// containsUnweanedAnimals). Top-level scalars are re-judged per state in
// `partRequired` via `effectiveStatus`.
const isMandatory = (obligation) =>
  obligation.status === 'mandatory' ||
  obligation.applyTo?.metadata?.whenTrue?.status === 'mandatory'

const toStructural = (obligation) => ({
  id: obligation.name,
  collection: isGroup(obligation),
  required: isMandatory(obligation),
  requiredAtLeastOne: Boolean(
    obligation.requires?.minEntries || obligation.requires?.anyOfIds
  ),
  item: isGroup(obligation)
    ? membersOf(obligation).map(toStructural)
    : undefined
})

const structuralByName = new Map(
  obligations.map((obligation) => [obligation.name, toStructural(obligation)])
)
const structuralOf = (name) => structuralByName.get(name)

// --- classification -------------------------------------------------------

const isFacet = (part) => typeof part !== 'string'
const facetParent = (part) => structuralOf(part.collection)
const facetMemberFilter = (part) =>
  part.only
    ? (member) => part.only.includes(member.id)
    : (member) => !part.except.includes(member.id)
const facetMembers = (part) =>
  (facetParent(part).item ?? []).filter(facetMemberFilter(part))
const isRequiredObligation = (o) =>
  Boolean(o?.required || o?.requiredAtLeastOne)
const isCollection = (o) => Boolean(o?.collection)
const partKey = (part) => (isFacet(part) ? part.collection : part)

// Top-level scalar requiredness comes from the evaluator's EFFECTIVE
// status — a retain-value gate (regionOfOriginCode) is in scope on both
// branches with a per-state mandatory/optional flip, so the static
// whenTrue heuristic would over-claim. Collections and flow-only parts
// keep the structural answer.
const scalarRequired = (part, state) => {
  const structural = structuralOf(part)
  if (structural?.collection) return isRequiredObligation(structural)
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

const partRequired = (part, state) =>
  isFacet(part) ? facetRequired(part) : scalarRequired(part, state)

const partStarted = (part, answers) => {
  if (!isFacet(part)) return isAnswered(answers[part])
  const members = facetMembers(part)
  return []
    .concat(answers[part.collection] ?? [])
    .some((entry) => members.some((member) => isAnswered(entry?.[member.id])))
}

// --- completeness: the evaluator state ------------------------------------

const isValueFulfilled = (name, value) => {
  const entry = domain.get(name)
  if (entry?.type === 'address' && typeof entry.isComplete === 'function') {
    return entry.isComplete(value)
  }
  return !isBlankValue(value)
}

// The record map for a grouped leaf ({ fulfilmentId: value }), or undefined.
const recordMap = (obligation, state) => {
  const stored = state.fulfilments?.[obligation.id]
  if (
    stored === undefined ||
    stored === null ||
    typeof stored !== 'object' ||
    Array.isArray(stored)
  ) {
    return undefined
  }
  return stored
}

// A leaf is present for a record iff the record's fulfilmentId is in the
// leaf's in-scope implication (post-purge membership).
const leafInScopeForRecord = (name, recId, state) => {
  const obligation = obligationFor(name)
  const impl = obligation && state.obligations?.[obligation.id]
  if (!impl?.inScope) return false
  return (impl.records ?? []).some((r) => r.fulfilmentId === recId)
}

const leafMandatoryForRecord = (name, recId, state) =>
  effectiveStatus(obligationFor(name), recId, state) === 'mandatory'

const leafFulfilledForRecord = (name, recId, state) => {
  const map = recordMap(obligationFor(name), state)
  return map === undefined ? false : isValueFulfilled(name, map[recId])
}

// A top-level scalar. Flow-only obligations the manifest does not carry
// (pre-flow filters like `importType`) have no fulfilment, so fall back to the
// answered check rather than a phantom fulfilment.
const singletonFulfilled = (name, answers, state) => {
  const obligation = obligationFor(name)
  return obligation
    ? isValueFulfilled(name, state.fulfilments?.[obligation.id])
    : isAnswered(answers[name])
}

// The in-scope records for a collection that sit directly under parentRecId
// (parentRecId null -> a top-level collection: all its records).
const childRecords = (obligation, parentRecId, state) => {
  const records = state.obligations?.[obligation.id]?.records ?? []
  return parentRecId === null
    ? records
    : records.filter((record) =>
        record.fulfilmentId.startsWith(`${parentRecId}/`)
      )
}

// Empty collection: satisfied iff there's no requiredAtLeastOne floor.
const emptyCollectionSatisfiesFloor = (collection) =>
  !collection.requiredAtLeastOne

// Collection cap (MAX_ENTRIES) — group-level, no instanceId.
const collectionCapExceeded = (invariantErrors) =>
  invariantErrors.some((error) => error.code === 'MAX_ENTRIES')

// Per-parent count invariant (recordCountEquals) — keyed by the PARENT
// record id (the commodity line), not this collection's own record ids,
// so it is checked here rather than per entry.
const parentCountInvariantViolated = (invariantErrors, parentRecId) =>
  parentRecId !== null &&
  invariantErrors.some((error) => error.instanceId === parentRecId)

// Every in-scope record complete, plus the requiredAtLeastOne floor,
// the collection cap and the per-parent count invariant.
// `memberFilter` applies only at THIS level (facet split); nested
// sub-collections recurse over all members.
const collectionSatisfied = (collection, parentRecId, memberFilter, state) => {
  const obligation = obligationFor(collection.id)
  if (!obligation) return true
  const records = childRecords(obligation, parentRecId, state)
  if (records.length === 0) return emptyCollectionSatisfiesFloor(collection)
  const invariantErrors = groupInvariantErrors(obligation, state)
  if (collectionCapExceeded(invariantErrors)) return false
  if (parentCountInvariantViolated(invariantErrors, parentRecId)) return false
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
  if (!leafInScopeForRecord(member.id, recId, state)) return true
  if (!leafMandatoryForRecord(member.id, recId, state)) return true
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

const partSatisfied = (part, answers, state) => {
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

// No required parts: OPTIONAL if untouched, else FULFILLED/IN_PROGRESS by
// whether every in-scope part is satisfied.
const optionalOrProgressStatus = (inScopeParts, started, answers, state) => {
  if (!started) return OPTIONAL
  const allSatisfied = inScopeParts.every((part) =>
    partSatisfied(part, answers, state)
  )
  return allSatisfied ? FULFILLED : IN_PROGRESS
}

// Required parts present: FULFILLED if every required part is satisfied,
// else IN_PROGRESS/NOT_STARTED by whether anything has been started.
const requiredPartsStatus = (required, started, answers, state) => {
  const requiredSatisfied = required.every((part) =>
    partSatisfied(part, answers, state)
  )
  if (requiredSatisfied) return FULFILLED
  return started ? IN_PROGRESS : NOT_STARTED
}

/**
 * The 5-way status for a list of parts.
 *
 * @param {Array<string|{collection:string, only?:string[], except?:string[]}>} parts - the row/section parts to roll up
 * @param {object} answers - the nested answer POJO.
 * @param {Set<string>} inScope - the pathKey scope Set.
 * @param {object} evaluation - the request-level evaluator result.
 * @returns {string} NA / NOT_STARTED / IN_PROGRESS / FULFILLED / OPTIONAL.
 */
export const statusOf = (parts, answers, inScope, evaluation) => {
  const inScopeParts = parts.filter((part) => inScope.has(partKey(part)))
  if (inScopeParts.length === 0) return NA

  const required = inScopeParts.filter((part) => partRequired(part, evaluation))
  const started = inScopeParts.some((part) => partStarted(part, answers))

  return required.length === 0
    ? optionalOrProgressStatus(inScopeParts, started, answers, evaluation)
    : requiredPartsStatus(required, started, answers, evaluation)
}
