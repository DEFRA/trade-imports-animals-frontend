/**
 * Runtime — small pure functions that read (obligations state × domain
 * × flow) and answer one specific question. No stateful evaluator; each
 * primitive stands alone.
 *
 * JourneyEvaluator primitives (implementing the design captured in
 * the parent EUDPA-277 spike doc §The JourneyEvaluator). The original
 * six primitives from that spec, plus the line/unit-scoped and
 * group-invariant primitives added since:
 *   - pageStatus(page, state)                       → NA / Optional / NS / IP / F
 *   - containerStatus(container, state)             → NA / Optional / NS / IP / F
 *   - journeyState(flow, state, submitted?)         → Optional / NS / IP / F / S
 *   - firstApplicablePage(root)                     → Page | null
 *   - firstUnfulfilledPage(root, state)             → Page | null
 *   - firstPagePresentingObligation(flow, oblId)    → Page | null
 *   - firstUnfulfilledPageForLine(root, state, lineId) → Page | null
 *   - firstUnfulfilledPageForUnit(root, state, lineId, unitId) → Page | null
 *   - expandPresents(page, state)                   → entry[]
 *   - effectiveStatus(obligation, path, state)       → 'mandatory' | 'optional' | undefined
 *   - groupInvariantErrors(group, state)             → error[]
 *   - groupInvariantErrorsForContainer(container, state) → error[]
 *   - STATUSES                                       → status constant map
 *
 * The state shape here is exactly what
 * `createObligationEvaluator({ obligations }).evaluate(fulfilments)`
 * returns: `{ fulfilments, obligations: implicationsByObligation }`.
 */

import { isBlankValue } from './is-blank-value.js'
import { domain } from '../domain/index.js'

// ---------------------------------------------------------------------------
// JourneyEvaluator primitives — navigation
// ---------------------------------------------------------------------------

const isPage = (node) => node.page !== undefined

/**
 * Depth-first walk to the first Page in declared order. Status-blind.
 * Used for default Section entry.
 */
export function firstApplicablePage(root) {
  if (isPage(root)) return root
  for (const child of root.children ?? []) {
    const hit = firstApplicablePage(child)
    if (hit) return hit
  }
  return null
}

/**
 * Depth-first walk to the first Page with status NS or IP. NA and F
 * pages are skipped. Used for Resume / Continue affordances.
 */
export function firstUnfulfilledPage(root, state) {
  if (isPage(root)) {
    const status = pageStatus(root, state)
    if (status === STATUSES.NOT_STARTED || status === STATUSES.IN_PROGRESS) {
      return root
    }
    return null
  }
  for (const child of root.children ?? []) {
    const hit = firstUnfulfilledPage(child, state)
    if (hit) return hit
  }
  return null
}

/**
 * Line-scoped analogue of `firstUnfulfilledPage`. Walks the pages of a
 * subsection (or any container) in declared order and returns the first
 * `presentsForEach` page where THIS line has an in-scope mandatory
 * obligation that is unfilled. Optional-status obligations are skipped
 * (their record.status is 'optional'). Used by the line-scoped page
 * controller to walk a single line's mandatories.
 */
export function firstUnfulfilledPageForLine(root, state, lineId) {
  if (isPage(root)) {
    const forEach = root.presentsForEach
    if (!forEach) return null
    const impl = state.obligations?.[forEach.obligation.id]
    if (!impl?.inScope) return null
    const record = impl.records?.find(
      (candidate) => candidate.fulfilmentId === lineId
    )
    if (!record) return null
    if ((record.status ?? 'mandatory') !== 'mandatory') return null
    const stored = state.fulfilments?.[forEach.obligation.id]?.[lineId]
    if (isBlankValue(stored)) return root
    return null
  }
  for (const child of root.children ?? []) {
    const hit = firstUnfulfilledPageForLine(child, state, lineId)
    if (hit) return hit
  }
  return null
}

/**
 * Unit-scoped analogue of `firstUnfulfilledPageForLine`. Walks the
 * pages of a subsection (or any container) in declared order and
 * returns the first `presentsForEach` page where the composite
 * `${lineId}/${unitId}` record has an in-scope mandatory obligation
 * that is unfilled. Optional-status obligations are skipped.
 *
 * Composite key: unit-scoped fulfilments live in
 * `state.fulfilments[obligation.id][`${lineId}/${unitId}`]` per the
 * obligations/evaluator.js PATH_DELIMITER convention. Records on
 * `state.obligations[obligation.id].records[].fulfilmentId` carry the
 * same composite string.
 */
export function firstUnfulfilledPageForUnit(root, state, lineId, unitId) {
  const compositeKey = `${lineId}/${unitId}`
  if (isPage(root)) {
    const forEach = root.presentsForEach
    if (!forEach) return null
    const impl = state.obligations?.[forEach.obligation.id]
    if (!impl?.inScope) return null
    const record = impl.records?.find(
      (candidate) => candidate.fulfilmentId === compositeKey
    )
    if (!record) return null
    if ((record.status ?? 'mandatory') !== 'mandatory') return null
    const stored = state.fulfilments?.[forEach.obligation.id]?.[compositeKey]
    if (isBlankValue(stored)) return root
    return null
  }
  for (const child of root.children ?? []) {
    const hit = firstUnfulfilledPageForUnit(child, state, lineId, unitId)
    if (hit) return hit
  }
  return null
}

/**
 * Depth-first walk over every section, returns the first Page whose
 * `presents` (post-expansion) references the given obligation id. Used
 * for CYA Change links.
 */
export function firstPagePresentingObligation(flow, obligationId) {
  const pageMentions = (page) => {
    const inPresents = (page.presents ?? []).some(
      (entry) => entry.obligation.id === obligationId
    )
    if (inPresents) return true
    return page.presentsForEach?.obligation?.id === obligationId
  }
  const walk = (node) => {
    if (isPage(node)) return pageMentions(node) ? node : null
    for (const child of node.children ?? []) {
      const hit = walk(child)
      if (hit) return hit
    }
    return null
  }
  for (const section of flow.sections ?? []) {
    const hit = walk(section)
    if (hit) return hit
  }
  return null
}

// ---------------------------------------------------------------------------
// JourneyEvaluator primitives — status
// ---------------------------------------------------------------------------

const presentedEntries = (page) =>
  (page.presents ?? []).map((entry) => ({
    obligation: entry.obligation,
    path: entry.path ?? null,
    mandatoryToProceed: entry.mandatoryToProceed ?? false,
    errors: entry.errors ?? null
  }))

// The virtual entries a `presentsForEach` page expands to — one per
// group-instance record present in the current post-purge state.
const forEachPresentedEntries = (page, state) => {
  const forEach = page.presentsForEach
  if (!forEach) return []
  const impl = state.obligations?.[forEach.forEachOf.id]
  const records = impl?.records ?? []
  return records.map((record) => ({
    obligation: forEach.obligation,
    path: record.fulfilmentId,
    mandatoryToProceed: forEach.mandatoryToProceed ?? false,
    errors: forEach.errors ?? null
  }))
}

/**
 * Expand a Page's `presents` + `presentsForEach` into a flat list of
 * `{ obligation, path, mandatoryToProceed, errors }` entries.
 *
 * `presentsForEach` expands to one virtual entry per group-instance
 * present in the current post-purge state — read from
 * `state.obligations[groupId].records`. When the group has zero in-
 * scope records the page collapses to NA via the pageStatus rule.
 *
 * Flow-level flags (`mandatoryToProceed`, `errors`) flow
 * through untouched so `build-field-descriptors` + `validatePagePayload`
 * can consume them. See flow.js for the property semantics.
 */
export function expandPresents(page, state) {
  return [...presentedEntries(page), ...forEachPresentedEntries(page, state)]
}

const STATUSES = {
  NOT_APPLICABLE: 'not-applicable',
  NOT_STARTED: 'not-started',
  OPTIONAL: 'optional',
  IN_PROGRESS: 'in-progress',
  FULFILLED: 'fulfilled',
  SUBMITTED: 'submitted'
}

// Field / derived-leaf records live in `impl.records[]`, each carrying
// { fulfilmentId, status: 'mandatory' | 'optional' }. Singleton
// implications carry `status` at the top level.
//
// Exported so callers can consult effective status when gating
// page-save mandates on branchedGate obligations (e.g. regionCode
// `mandatoryToProceed` on the `no` branch).
export function effectiveStatus(obligation, path, state) {
  const impl = state.obligations?.[obligation.id]
  if (!impl) return undefined
  if (path === null) return impl.status ?? 'mandatory'
  const record = (impl.records ?? []).find(
    (candidate) => candidate.fulfilmentId === path
  )
  return record?.status ?? 'mandatory'
}

// A presents entry is in scope iff:
//   - the obligation implication says inScope, AND
//   - when the obligation is `within` a group, path IS present in the
//     group's records (i.e. that instance still exists post-purge).
function entryInScope(entry, state) {
  const impl = state.obligations?.[entry.obligation.id]
  if (!impl || !impl.inScope) return false
  if (entry.path === null) return true
  const records = impl.records ?? []
  return records.some((record) => record.fulfilmentId === entry.path)
}

/** Check whether a single value counts as "fulfilled" for an
 *  obligation. Address obligations delegate to `domainEntry.isComplete`
 *  so a partially-filled composite (some required sub-fields still
 *  blank) is treated as unfilled — the task list keeps the containing
 *  subsection In progress and CYA emits a "Complete the address"
 *  prompt. Non-address obligations fall back to the shared
 *  isBlankValue helper. */
function isValueFulfilled(oblId, value) {
  const entry = domain.get(oblId)
  if (entry?.type === 'address' && typeof entry.isComplete === 'function') {
    return entry.isComplete(value)
  }
  return !isBlankValue(value)
}

// The obligation's raw stored value — a scalar for a singleton obligation,
// or a `{ fulfilmentId: value }` map for a path-scoped one.
const storedValueFor = (entry, state) =>
  state.fulfilments?.[entry.obligation.id]

// `stored` is not a plain map, so the path-scoped record can't exist.
const isRecordMap = (stored) =>
  stored !== undefined &&
  stored !== null &&
  typeof stored === 'object' &&
  !Array.isArray(stored)

// Singleton obligation — `stored` IS the value being checked.
const isSingletonFulfilled = (entry, stored) =>
  isValueFulfilled(entry.obligation.id, stored)

const isRecordFulfilled = (entry, stored) =>
  isRecordMap(stored) &&
  isValueFulfilled(entry.obligation.id, stored[entry.path])

function hasFulfilment(entry, state) {
  const stored = storedValueFor(entry, state)
  return entry.path === null
    ? isSingletonFulfilled(entry, stored)
    : isRecordFulfilled(entry, stored)
}

const touchedEntries = (inScope, state) =>
  inScope.filter((entry) => hasAnyInput(entry, state))

// `{ total, unsatisfied }` mandatory-concern counts — mandatory obligations
// in scope plus group-invariant errors, and the subset still unfulfilled.
const mandatoryConcernCounts = (inScope, state, groupErrorCount) => {
  const mandatoryInScope = inScope.filter(
    (entry) =>
      effectiveStatus(entry.obligation, entry.path, state) === 'mandatory'
  )
  const mandatoryUnfulfilled = mandatoryInScope.filter(
    (entry) => !hasFulfilment(entry, state)
  )
  return {
    total: mandatoryInScope.length + groupErrorCount,
    unsatisfied: mandatoryUnfulfilled.length + groupErrorCount
  }
}

const statusFromCounts = (counts, touchedCount) => {
  if (counts.total > 0) {
    if (counts.unsatisfied === 0) return STATUSES.FULFILLED
    if (touchedCount === 0) return STATUSES.NOT_STARTED
    return STATUSES.IN_PROGRESS
  }
  // Only optional obligations are in scope — Case A.
  if (touchedCount === 0) return STATUSES.OPTIONAL
  return STATUSES.FULFILLED
}

/**
 * 5-way status classifier — shared by pageStatus and containerStatus.
 * Takes the flat list of in-scope presented entries (whether from a
 * single page or aggregated across a subtree) plus the count of
 * unsatisfied group-invariant instances (0 at page level; the count
 * of `groupInvariantErrors` at container level).
 *
 * Rules (mutually exclusive, exhaustive):
 *   - NA        no in-scope obligations at all.
 *   - Optional  no in-scope MANDATORY obligation, at least one in-scope
 *               OPTIONAL obligation, no user input anywhere. Signals
 *               "there's opt-in room here, you haven't engaged yet."
 *               (No visited plumbing — engagement is measured by
 *               ≥ 1 non-blank value, same as everywhere else.)
 *   - NS        at least one mandatory concern, no user input anywhere.
 *   - IP        at least one mandatory concern still unsatisfied, at
 *               least one obligation has non-blank input.
 *   - F         either only optional in scope with ≥ 1 fulfilled, OR
 *               all mandatory concerns satisfied.
 *
 * "Fulfilled" vs "has input" — the two signals differ for addresses:
 *
 *   - `hasFulfilment(entry, state)` calls `isValueFulfilled` which
 *     consults `domainEntry.isComplete(value)` for address
 *     obligations. A partial address (one required sub-field filled)
 *     is NOT fulfilled — the whole address must be structurally
 *     complete to count as F.
 *   - `hasAnyInput(entry, state)` calls `!isBlankValue(value)`
 *     directly. A partial address IS input — the user typed
 *     something, so the subsection reads IP not NS.
 *
 * For scalars the two are identical (both boil down to
 * `!isBlankValue(value)`). The distinction only matters for the
 * NS↔IP transition on containers that include an incompletely-filled
 * address obligation.
 *
 * Group-invariant errors (e.g. "≥ 1 identifier per unit") count as
 * additional unsatisfied mandatory concerns — an unfilled invariant
 * blocks F the same way an unfilled mandatory obligation would. The
 * count-based encoding lets a single classifier serve every level.
 */
function classifyEntries(inScope, state, groupErrorCount) {
  if (inScope.length === 0 && groupErrorCount === 0) {
    return STATUSES.NOT_APPLICABLE
  }
  const touched = touchedEntries(inScope, state)
  const counts = mandatoryConcernCounts(inScope, state, groupErrorCount)
  return statusFromCounts(counts, touched.length)
}

/** True iff the user has typed ANY non-blank value into the entry.
 *  For scalars this is `!isBlankValue(stored)`. For address
 *  obligations it's also `!isBlankValue(stored)` — a composite with
 *  any non-empty leaf counts as "input" even though the address
 *  isn't structurally complete yet. This is what distinguishes NS
 *  (no user input anywhere) from IP (user has made some progress
 *  but the mandatory concern isn't fulfilled). Contrast with
 *  `hasFulfilment` which requires the address to be `isComplete`. */
function hasAnyInput(entry, state) {
  const stored = storedValueFor(entry, state)
  if (entry.path === null) return !isBlankValue(stored)
  return isRecordMap(stored) && !isBlankValue(stored[entry.path])
}

/**
 * Page status — 5-way classifier over the page's in-scope presented
 * entries. Group-invariant errors are container-level (a single page
 * cannot enforce "≥ 1 across the group" on its own), so pageStatus
 * always passes 0.
 *
 * See classifyEntries for the alphabet.
 */
export function pageStatus(page, state) {
  const inScope = expandPresents(page, state).filter((entry) =>
    entryInScope(entry, state)
  )
  return classifyEntries(inScope, state, 0)
}

/**
 * Container status — re-derives over the subtree's collected in-scope
 * presented entries rather than rolling up child statuses. Same 5-way
 * classifier that pageStatus uses.
 *
 * Why re-derive rather than roll up:
 *   - The alphabet is 5-way (NA / Optional / NS / IP / F), and roll-up
 *     precedence rules for the mix cases (e.g. Optional + NS + F) get
 *     fiddly. The classifier is uniform at every level.
 *   - The old "empty-session clamp" (returning NS while any subtree
 *     leaf is untouched) goes away — the classifier already returns
 *     Optional / NS naturally for the "nothing filled yet" case,
 *     depending on whether any mandatory is in scope.
 *
 * Group-invariant errors are counted here: if a container's subtree
 * presents a group with unsatisfied `requires`, each violating instance
 * adds one to the mandatory-concern total. That keeps a container with
 * every leaf filled but a missing group invariant out of F. See
 * `groupInvariantErrorsForContainer` below.
 */
export function containerStatus(container, state) {
  if (isPage(container)) return pageStatus(container, state)
  const inScope = collectInScopePresentedEntries(container, state)
  const groupErrors = groupInvariantErrorsForContainer(container, state)
  return classifyEntries(inScope, state, groupErrors.length)
}

/** Walk `container`'s subtree, collect every page's in-scope presented
 *  entries into a flat list. Used by containerStatus + journeyState so
 *  the 5-way classifier operates on the subtree's obligations directly
 *  (rather than rolling up child statuses). */
function collectInScopePresentedEntries(container, state) {
  const out = []
  const visit = (node) => {
    if (isPage(node)) {
      const entries = expandPresents(node, state).filter((entry) =>
        entryInScope(entry, state)
      )
      out.push(...entries)
      return
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(container)
  return out
}

// Each `checkXxx` below implements one `requires` rule shape from
// `groupInvariantErrors`'s doc comment. Single-error rules return the
// error object or `null`; multi-error rules (one error per instance)
// return an array. `groupInvariantErrors` composes and flattens them.

const checkMinEntries = (group, records) => {
  const { minEntries, errorCode } = group.requires
  if (typeof minEntries !== 'number' || records.length >= minEntries) {
    return null
  }
  return {
    code: 'MIN_ENTRIES',
    groupId: group.id,
    groupName: group.name,
    errorCode,
    minEntries,
    actual: records.length
  }
}

const checkMaxEntries = (group, records) => {
  const { maxEntries, errorCode } = group.requires
  if (typeof maxEntries !== 'number' || records.length <= maxEntries) {
    return null
  }
  return {
    code: 'MAX_ENTRIES',
    groupId: group.id,
    groupName: group.name,
    errorCode: group.requires.maxEntriesErrorCode ?? errorCode,
    maxEntries,
    actual: records.length
  }
}

const checkAnyOfIds = (group, records, state) => {
  if (!group.requires.anyOfIds) return []
  const errors = []
  for (const record of records) {
    const instanceId = record.fulfilmentId
    const inScopeLeafIds = group.requires.anyOfIds.filter((leafId) => {
      const impl = state.obligations?.[leafId]
      if (!impl?.inScope) return false
      return (impl.records ?? []).some(
        (candidate) => candidate.fulfilmentId === instanceId
      )
    })
    if (inScopeLeafIds.length === 0) continue
    const anyFilled = inScopeLeafIds.some((leafId) => {
      const stored = state.fulfilments?.[leafId]?.[instanceId]
      return !isBlankValue(stored)
    })
    if (!anyFilled) {
      errors.push({
        code: group.requires.errorCode,
        groupId: group.id,
        groupName: group.name,
        instanceId
      })
    }
  }
  return errors
}

const checkAllOrNothingOfIds = (group, state) => {
  if (!group.requires.allOrNothingOfIds) return null
  const memberIds = group.requires.allOrNothingOfIds
  const filledIds = memberIds.filter(
    (id) => !isBlankValue(state.fulfilments?.[id])
  )
  if (filledIds.length === 0 || filledIds.length >= memberIds.length) {
    return null
  }
  const missingIds = memberIds.filter((id) =>
    isBlankValue(state.fulfilments?.[id])
  )
  return {
    code: group.requires.errorCode,
    groupId: group.id,
    groupName: group.name,
    missingIds
  }
}

const checkRecordCountEquals = (group, records, state) => {
  if (!group.requires.recordCountEquals || !group.within) return []
  const { fieldId, errorCode: countErrorCode } =
    group.requires.recordCountEquals
  const parentImpl = state.obligations?.[group.within.id]
  const parentRecords = parentImpl?.records ?? []
  const errors = []
  for (const parentRec of parentRecords) {
    const parentId = parentRec.fulfilmentId
    const expected = state.fulfilments?.[fieldId]?.[parentId]
    if (isBlankValue(expected)) continue
    const actual = records.filter((record) =>
      record.fulfilmentId.startsWith(`${parentId}/`)
    ).length
    if (actual !== expected) {
      errors.push({
        code: countErrorCode,
        groupId: group.id,
        groupName: group.name,
        instanceId: parentId,
        expected,
        actual
      })
    }
  }
  return errors
}

/**
 * groupInvariantErrors(group, state)
 *   → [{ code, groupId, groupName, ... }]
 *
 * Emits one entry per unsatisfied invariant on the group. Five rules
 * are supported; a group may carry any combination.
 *
 *   - `requires.minEntries` — collection floor. Emits ONE
 *     `{ code: 'MIN_ENTRIES', minEntries, actual }` when
 *     `records.length` is below the floor. Without this, a group with
 *     zero records collapses to NA and `journeyState → fulfilled` for
 *     an empty consignment. Wired into `commodityLine` (minEntries: 1)
 *     in obligations.js.
 *
 *   - `requires.maxEntries` — collection cap. Symmetric to
 *     minEntries. Emits ONE `{ code: 'MAX_ENTRIES', maxEntries,
 *     actual, errorCode }` when `records.length` exceeds the cap.
 *     Wired into the documents group (maxEntries: 10) — a UI also
 *     enforces the cap on the Add affordance but the invariant is
 *     authoritative for after-the-fact defence (e.g. a redeploy
 *     lowering the cap after the user saved records over the new
 *     limit).
 *
 *   - `requires.anyOfIds` — per-instance rule. Emits one error per
 *     in-scope instance where NONE of the required leaves has a
 *     fulfilment (and where the instance has at least one required
 *     leaf in scope — otherwise the invariant is vacuously
 *     satisfied). Same `isBlankValue` semantics as `hasFulfilment`
 *     so composite-address all-blank values are treated as unfilled.
 *     This is the primitive the V4 "at least one Animal Identifier
 *     per unit-record" rule rides on. `unitRecord.requires = {
 *     anyOfIds: [ passport, tattoo, earTag, horseName,
 *     identificationDetails, description ] }` in obligations.js.
 *
 *   - `requires.allOrNothingOfIds` — notification-level field-block
 *     rule. Members are ordinary scalar (notification-level)
 *     obligations, keyed directly by their obligation id in
 *     `state.fulfilments`. Emits ONE error `{ code, groupId,
 *     groupName, missingIds }` when 0 < filledCount < total (partial
 *     block); zero errors when all-blank (block inactive) or all-
 *     filled (block complete). Uses the same `isBlankValue` predicate
 *     as the anyOfIds walk so blank strings / null / undefined /
 *     empty arrays all count as "not filled". No manifest carrier
 *     today — retained as a general primitive.
 *
 *   - `requires.recordCountEquals` — cross-group per-parent-instance
 *     count check. `{ fieldId, errorCode }`. For each in-scope parent
 *     (`group.within`) instance `parentId`: read the expected count
 *     from `state.fulfilments[fieldId][parentId]`, skip when blank
 *     (relies on the field's own mandatory rule to catch the missing
 *     case), count `records` whose `fulfilmentId.startsWith(parentId
 *     + '/')`, emit one error per mismatch. Wired into the
 *     animalIdentifiers group (`fieldId = numberOfAnimalsQuantity`'s
 *     id) so the count of animals on a commodity line matches the
 *     trader's declared quantity.
 *
 * All five rule shapes contribute uniformly to `classifyEntries`'
 * `groupErrorCount` — an unmet floor / cap / anyOf / all-or-nothing
 * / count-mismatch blocks F identically.
 */
export function groupInvariantErrors(group, state) {
  if (!group?.requires) return []
  const groupImpl = state.obligations?.[group.id]
  if (!groupImpl?.inScope) return []
  const records = groupImpl.records ?? []
  return [
    checkMinEntries(group, records),
    checkMaxEntries(group, records),
    ...checkAnyOfIds(group, records, state),
    checkAllOrNothingOfIds(group, state),
    ...checkRecordCountEquals(group, records, state)
  ].filter(Boolean)
}

const groupFromForEach = (node) => node.presentsForEach?.forEachOf ?? null

const groupsFromPresentedContainers = (node) =>
  (node.presents ?? []).flatMap((entry) => entry.obligation?.containers ?? [])

/** Collect every group obligation whose invariants apply to this
 *  container's subtree. Two edges into the collector:
 *
 *   - `presentsForEach.forEachOf` — records-shaped groups the
 *     container fans out over (e.g. commodityLine, unitRecord). These
 *     carry `requires.minEntries` / `requires.anyOfIds`.
 *
 *   - Notification-level containers referenced by a member obligation's
 *     back-ref `obligation.containers` (populated at manifest export
 *     time by the `allOrNothingOfIds` back-linker). Any container whose
 *     invariant reads a scalar obligation presented on this page is
 *     relevant here — same visibility rule as `presentsForEach` but for
 *     scalar-storage field blocks.
 */
function collectGroupsPresentedIn(container) {
  const groups = new Map()
  const visit = (node) => {
    const forEachGroup = groupFromForEach(node)
    if (forEachGroup) groups.set(forEachGroup.id, forEachGroup)
    for (const groupContainer of groupsFromPresentedContainers(node)) {
      groups.set(groupContainer.id, groupContainer)
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(container)
  return [...groups.values()]
}

/** Union of `groupInvariantErrors` across every group presented under
 *  this container. Empty when the container doesn't touch a group
 *  with `requires` or when every in-scope instance satisfies it. */
export function groupInvariantErrorsForContainer(container, state) {
  if (isPage(container)) return []
  const groups = collectGroupsPresentedIn(container)
  const out = []
  for (const group of groups) {
    if (!group.requires) continue
    out.push(...groupInvariantErrors(group, state))
  }
  return out
}

/**
 * Journey status. `submitted` short-circuits to SUBMITTED — the F→S
 * transition is a user-driven event, not a derivable status.
 *
 * Everything else runs through the same 5-way classifier that page and
 * container statuses use, over every in-scope presented entry in the
 * whole flow. In practice V4 has mandatory obligations somewhere in
 * every journey, so `journeyState` will never actually return Optional
 * — but the rule is written for symmetry with `pageStatus` /
 * `containerStatus` and to keep the alphabet coherent.
 */
export function journeyState(flow, state, submitted = false) {
  if (submitted) return STATUSES.SUBMITTED
  const inScope = []
  let groupErrorCount = 0
  for (const section of flow.sections ?? []) {
    inScope.push(...collectInScopePresentedEntries(section, state))
    groupErrorCount += groupInvariantErrorsForContainer(section, state).length
  }
  // Empty flow modelled as NS rather than NA to match the current
  // "journey starts here" affordance — a journey with no sections at
  // all is not a meaningful application-domain state, but the caller
  // (`/start` handler) expects a non-NA return.
  if (inScope.length === 0 && groupErrorCount === 0) {
    return STATUSES.NOT_STARTED
  }
  return classifyEntries(inScope, state, groupErrorCount)
}

export { STATUSES }
