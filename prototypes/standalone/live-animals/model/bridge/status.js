/**
 * Project the obligation implications into the 5-way task/section status.
 *
 * `statusOf(parts, answers, inScope)` is the sole runtime source of the 5-way
 * task/section status at the row/section callers (`flow/task-rows.js`
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
 * The collection floor is manifest-sourced: `commodityLines` from
 * `requires.minEntries`, `animalIdentifiers` from `requires.anyOfIds` (a
 * per-unit any-of). See DESIGN-DELTA.md §19, §26.
 */

import { obligations, groups } from '../obligations/obligations.js'
import { createObligationEvaluator } from '../obligations/evaluator.js'
import { answersToFulfilments } from './fulfilments.js'
import { effectiveStatus } from '../engine/index.js'
import { isBlankValue } from '../engine/is-blank-value.js'
import { domain } from '../domain/index.js'
import { isAnswered } from '../../lib/answered.js'
import { SYSTEM_POPULATED } from '../../flow/obligation-source.js'

export const NA = 'not-applicable'
export const NOT_STARTED = 'not-started'
export const IN_PROGRESS = 'in-progress'
export const FULFILLED = 'fulfilled'
export const OPTIONAL = 'optional'

const evaluator = createObligationEvaluator()
const bByAId = new Map(obligations.map((o) => [o.name, o]))
const bOf = (aId) => bByAId.get(aId)

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
//   .requiredOneOf     → `requires.anyOfIds`, resolved to member names
//   .item              → obligations whose `within` is this group

const bByUuid = new Map(obligations.map((o) => [o.id, o]))
const bIsGroup = (o) => groups.includes(o)

// Collection members for status = the group's `within` obligations MINUS the
// system-populated placeholders (`commodityType` et al) that no page collects
// — the same exclusion `flow/dispatch.js` applies when indexing pages to
// obligations.
const bMembersOf = (group) =>
  obligations.filter((o) => o.within === group && !SYSTEM_POPULATED.has(o.name))

// Mandatory-when-in-scope: a static `status: 'mandatory'`, or a conditional
// gate whose in-scope (whenTrue) branch is mandatory (transitedCountries,
// commercial/privateTransporter, regionCode, purposeInInternalMarket, cph,
// containsUnweanedAnimals).
const bIsMandatory = (o) =>
  o.status === 'mandatory' ||
  o.applyTo?.metadata?.whenTrue?.status === 'mandatory'

const toStructural = (o) => ({
  id: o.name,
  collection: bIsGroup(o),
  required: bIsMandatory(o),
  requiredAtLeastOne: Boolean(o.requires?.minEntries || o.requires?.anyOfIds),
  requiredOneOf: o.requires?.anyOfIds?.map((uuid) => bByUuid.get(uuid).name),
  item: bIsGroup(o) ? bMembersOf(o).map(toStructural) : undefined
})

const structuralByName = new Map(
  obligations.map((o) => [o.name, toStructural(o)])
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

const partRequired = (part) => {
  if (!isFacet(part)) return isRequiredObligation(structuralOf(part))
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

// --- completeness: the evaluator state ------------------------------------

const isValueFulfilled = (aId, value) => {
  const entry = domain.get(aId)
  if (entry?.type === 'address' && typeof entry.isComplete === 'function') {
    return entry.isComplete(value)
  }
  return !isBlankValue(value)
}

// The record map for a grouped leaf ({ fulfilmentId: value }), or undefined.
const recordMap = (bObligation, state) => {
  const stored = state.fulfilments?.[bObligation.id]
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
const leafInScopeForRecord = (aId, recId, state) => {
  const b = bOf(aId)
  const impl = b && state.obligations?.[b.id]
  if (!impl?.inScope) return false
  return (impl.records ?? []).some((r) => r.fulfilmentId === recId)
}

const leafMandatoryForRecord = (aId, recId, state) =>
  effectiveStatus(bOf(aId), recId, state) === 'mandatory'

const leafFulfilledForRecord = (aId, recId, state) => {
  const map = recordMap(bOf(aId), state)
  return map === undefined ? false : isValueFulfilled(aId, map[recId])
}

// A top-level scalar. Flow-only obligations the manifest does not carry
// (pre-flow filters like `importType`) have no fulfilment, so fall back to the
// answered check rather than a phantom fulfilment.
const singletonFulfilled = (aId, answers, state) => {
  const b = bOf(aId)
  return b
    ? isValueFulfilled(aId, state.fulfilments?.[b.id])
    : isAnswered(answers[aId])
}

// The in-scope records for a collection that sit directly under parentRecId
// (parentRecId null -> a top-level collection: all its records).
const childRecords = (bColl, parentRecId, state) => {
  const records = state.obligations?.[bColl.id]?.records ?? []
  return parentRecId === null
    ? records
    : records.filter((r) => r.fulfilmentId.startsWith(`${parentRecId}/`))
}

// Every in-scope record complete, plus the requiredAtLeastOne floor.
// `memberFilter` applies only at THIS level (facet split); nested
// sub-collections recurse over all members.
const collectionSatisfied = (aColl, parentRecId, memberFilter, state) => {
  const bColl = bOf(aColl.id)
  if (!bColl) return true
  const records = childRecords(bColl, parentRecId, state)
  if (records.length === 0) return !aColl.requiredAtLeastOne
  return records.every((rec) =>
    entrySatisfied(aColl, rec.fulfilmentId, memberFilter, state)
  )
}

// The requiredOneOf any-of rule for this record, then every filtered member
// (nested collection -> recurse; leaf -> satisfied unless in scope AND
// mandatory AND unfulfilled).
const entrySatisfied = (aColl, recId, memberFilter, state) => {
  const members = memberFilter
    ? (aColl.item ?? []).filter(memberFilter)
    : (aColl.item ?? [])

  if (aColl.requiredOneOf) {
    const ownedIds = aColl.requiredOneOf.filter((id) =>
      members.some((member) => member.id === id)
    )
    const inScopeOwned = ownedIds.filter((id) =>
      leafInScopeForRecord(id, recId, state)
    )
    if (
      inScopeOwned.length > 0 &&
      !inScopeOwned.some((id) => leafFulfilledForRecord(id, recId, state))
    ) {
      return false
    }
  }

  return members.every((member) => {
    if (isCollection(member)) {
      return collectionSatisfied(member, recId, null, state)
    }
    if (!leafInScopeForRecord(member.id, recId, state)) return true
    if (!leafMandatoryForRecord(member.id, recId, state)) return true
    return leafFulfilledForRecord(member.id, recId, state)
  })
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
  const aObl = structuralOf(part)
  if (isCollection(aObl)) return collectionSatisfied(aObl, null, null, state)
  return singletonFulfilled(part, answers, state)
}

/**
 * The 5-way status for a list of parts.
 *
 * @param {Array<string|{collection:string, only?:string[], except?:string[]}>} parts
 * @param {object} answers - the nested answer POJO.
 * @param {Set<string>} inScope - the pathKey scope Set.
 * @returns {string} NA / NOT_STARTED / IN_PROGRESS / FULFILLED / OPTIONAL.
 */
export const statusOf = (parts, answers, inScope) => {
  const inScopeParts = parts.filter((part) => inScope.has(partKey(part)))
  if (inScopeParts.length === 0) return NA

  const state = evaluator.evaluate(answersToFulfilments(answers))
  const required = inScopeParts.filter(partRequired)

  const started = inScopeParts.some((part) => partStarted(part, answers))

  if (required.length === 0) {
    if (!started) return OPTIONAL
    const allSatisfied = inScopeParts.every((part) =>
      partSatisfied(part, answers, state)
    )
    return allSatisfied ? FULFILLED : IN_PROGRESS
  }

  const requiredSatisfied = required.every((part) =>
    partSatisfied(part, answers, state)
  )
  if (requiredSatisfied) return FULFILLED
  return started ? IN_PROGRESS : NOT_STARTED
}
