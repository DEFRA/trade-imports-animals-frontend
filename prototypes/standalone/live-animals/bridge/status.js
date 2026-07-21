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
 * The empty-collection floor is manifest-sourced (`requiredAtLeastOne`:
 * `requires.minEntries` or `requires.anyOfIds`) and stays a presentation
 * rule — the engine emits nothing for a group with zero records, but an
 * empty required collection must still block FULFILLED. The per-record
 * any-of verdict is sourced from the engine's `groupInvariantErrors`
 * (filtered by instanceId), the same interpreter collection-complete
 * uses.
 */

import { obligations, groups } from '../model/obligations/obligations.js'
import { createObligationEvaluator } from '../model/obligations/evaluator.js'
import { answersToFulfilments } from './fulfilments.js'
import { effectiveStatus, groupInvariantErrors } from '../model/engine/index.js'
import { isBlankValue } from '../model/engine/is-blank-value.js'
import { domain } from '../model/domain/index.js'
import { isAnswered } from '../lib/answered.js'
import { SYSTEM_POPULATED } from '../flow/obligation-source.js'

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
//   .item              → obligations whose `within` is this group

const bIsGroup = (o) => groups.includes(o)

// Collection members for status = the group's `within` obligations MINUS the
// system-populated placeholders (`commodityType` et al) that no page collects
// — the same exclusion `flow/dispatch.js` applies when indexing pages to
// obligations.
const bMembersOf = (group) =>
  obligations.filter((o) => o.within === group && !SYSTEM_POPULATED.has(o.name))

// Structural mandatory-when-in-scope fallback: a static `status:
// 'mandatory'`, or a conditional gate whose whenTrue branch is mandatory
// (commercial/privateTransporter, purposeInInternalMarket, cph,
// containsUnweanedAnimals). Top-level scalars are re-judged per state in
// `partRequired` via `effectiveStatus`.
const bIsMandatory = (o) =>
  o.status === 'mandatory' ||
  o.applyTo?.metadata?.whenTrue?.status === 'mandatory'

const toStructural = (o) => ({
  id: o.name,
  collection: bIsGroup(o),
  required: bIsMandatory(o),
  requiredAtLeastOne: Boolean(o.requires?.minEntries || o.requires?.anyOfIds),
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

// Top-level scalar requiredness comes from the evaluator's EFFECTIVE
// status — a retain-value gate (regionOfOriginCode) is in scope on both
// branches with a per-state mandatory/optional flip, so the static
// whenTrue heuristic would over-claim. Collections, facets and flow-only
// parts keep the structural answer.
const partRequired = (part, state) => {
  if (!isFacet(part)) {
    const structural = structuralOf(part)
    if (structural?.collection) return isRequiredObligation(structural)
    const b = bOf(part)
    if (b && state) return effectiveStatus(b, null, state) === 'mandatory'
    return isRequiredObligation(structural)
  }
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

// Every in-scope record complete, plus the requiredAtLeastOne floor,
// the collection cap and the per-parent count invariant.
// `memberFilter` applies only at THIS level (facet split); nested
// sub-collections recurse over all members.
const collectionSatisfied = (aColl, parentRecId, memberFilter, state) => {
  const bColl = bOf(aColl.id)
  if (!bColl) return true
  const records = childRecords(bColl, parentRecId, state)
  if (records.length === 0) return !aColl.requiredAtLeastOne
  const invariantErrors = groupInvariantErrors(bColl, state)
  // Collection cap (MAX_ENTRIES) — group-level, no instanceId.
  if (invariantErrors.some((error) => error.code === 'MAX_ENTRIES')) {
    return false
  }
  // Per-parent count invariant (recordCountEquals) — keyed by the
  // PARENT record id (the commodity line), not this collection's own
  // record ids, so it is checked here rather than per entry.
  if (
    parentRecId !== null &&
    invariantErrors.some((error) => error.instanceId === parentRecId)
  ) {
    return false
  }
  return records.every((rec) =>
    entrySatisfied(
      aColl,
      rec.fulfilmentId,
      memberFilter,
      invariantErrors,
      state
    )
  )
}

// The engine's per-record group-invariant verdict (the anyOfIds rule),
// then every filtered member (nested collection -> recurse; leaf ->
// satisfied unless in scope AND mandatory AND unfulfilled). MIN_ENTRIES
// errors carry no instanceId, so only per-record violations bite here.
const entrySatisfied = (aColl, recId, memberFilter, invariantErrors, state) => {
  const members = memberFilter
    ? (aColl.item ?? []).filter(memberFilter)
    : (aColl.item ?? [])

  if (invariantErrors.some((error) => error.instanceId === recId)) {
    return false
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
  const required = inScopeParts.filter((part) => partRequired(part, state))

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
