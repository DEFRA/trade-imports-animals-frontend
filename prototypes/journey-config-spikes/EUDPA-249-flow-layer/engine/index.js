/**
 * Runtime — small pure functions that read (obligations state × domain
 * × flow) and answer one specific question. No stateful evaluator; each
 * primitive stands alone.
 *
 * Two families:
 *
 *   1. JourneyEvaluator primitives (implementing the design captured in
 *      the parent EUDPA-277 spike doc §The JourneyEvaluator):
 *        - pageStatus(page, state)                       → NA / Optional / NS / IP / F
 *        - containerStatus(container, state)             → NA / Optional / NS / IP / F
 *        - journeyState(flow, state, submitted?)         → Optional / NS / IP / F / S
 *        - firstApplicablePage(root)                     → Page | null
 *        - firstUnfulfilledPage(root, state)             → Page | null
 *        - firstPagePresentingObligation(flow, oblId)    → Page | null
 *
 *   2. Domain primitives (new in this spike):
 *        - optionsFor(obligation, fulfilments, ids, domain, ctx?) → string[]
 *        - validate(obligation, value, fulfilments, domain, ctx?) → error[]
 *
 * The state shape here is exactly what
 * `createObligationEvaluator({ obligations }).evaluate(fulfilments)`
 * returns: `{ fulfilments, obligations: implicationsByObligation }`.
 */

import { isBlankValue } from '../lib/is-blank-value.js'
import { domain } from '../domain/index.js'

// ---------------------------------------------------------------------------
// Domain primitives
// ---------------------------------------------------------------------------

/**
 * Resolve the current legal options for an enum obligation.
 * Returns `[]` when the obligation has no domain entry or the entry is
 * not an enum.
 *
 * `ctx` (optional): `{ path }` for scoped resolution — currently just
 * forwarded to the domain closure for future-proofing.
 */
export function optionsFor(obligation, fulfilments, ids, domain, ctx = {}) {
  const entry = domain.get(obligation.id)
  if (!entry || entry.type !== 'enum') return []
  return entry.options(fulfilments, ids, ctx) ?? []
}

/**
 * Validate a single value against the domain entry for an obligation.
 * Returns an array of error records (empty on pass).
 *
 * `ctx`: `{ path?, ids? }`
 *   - path: null for singletons; group-instance path (e.g. 'line1') for
 *     obligations inside a `within` group.
 *   - ids: the same `Map<obligationId, string[]>` the ObligationEvaluator
 *     builds; forwarded to enum closures.
 *
 * `siblingValue(obligation)` reads a sibling obligation's value at the
 * same `path` — same idiom as reading fulfilments inside an obligation
 * `applyTo`.
 */
export function validate(obligation, value, fulfilments, domain, ctx = {}) {
  const entry = domain.get(obligation.id)
  if (!entry) return []
  const path = ctx.path ?? null

  const siblingValue = (siblingObligation) => {
    const stored = fulfilments[siblingObligation.id]
    if (path === null) return stored
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return stored[path]
    }
    return undefined
  }
  const predicateCtx = { fulfilments, path, siblingValue, ids: ctx.ids }

  const errors = []

  if (entry.type === 'enum') {
    if (value === undefined || value === null || value === '') {
      // fall through to entry.predicate if any (e.g. min-selections)
    } else {
      const options = entry.options(fulfilments, ctx.ids, ctx) ?? []
      const values = Array.isArray(value) ? value : [value]
      const invalid = values.filter((v) => !options.includes(v))
      if (invalid.length > 0) {
        errors.push({
          code: 'domain.enum.notInOptions',
          obligation: obligation.name,
          path,
          invalid,
          options
        })
      }
    }
  }

  // Predicates run even for enum entries — e.g. transitedCountries is
  // an enum whose extra rule is "max 12 selections". Both errors surface.
  if (entry.predicate) {
    errors.push(...entry.predicate(value, predicateCtx))
  }
  return errors
}

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
    if (status === 'not-started' || status === 'in-progress') return root
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
    const record = impl.records?.find((r) => r.fulfilmentId === lineId)
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
    const record = impl.records?.find((r) => r.fulfilmentId === compositeKey)
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
      (e) => e.obligation.id === obligationId
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
  const out = []
  for (const entry of page.presents ?? []) {
    out.push({
      obligation: entry.obligation,
      path: entry.path ?? null,
      mandatoryToProceed: entry.mandatoryToProceed ?? false,
      errors: entry.errors ?? null
    })
  }
  const forEach = page.presentsForEach
  if (forEach) {
    const impl = state.obligations?.[forEach.forEachOf.id]
    const records = impl?.records ?? []
    for (const record of records) {
      out.push({
        obligation: forEach.obligation,
        path: record.fulfilmentId,
        mandatoryToProceed: forEach.mandatoryToProceed ?? false,
        errors: forEach.errors ?? null
      })
    }
  }
  return out
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
// Exported so contract.js can consult effective status when gating
// page-save mandates on branchedGate obligations — see audit re-
// review finding NEW-1 (regionCode `mandatoryToProceed` on the
// `no` branch).
export function effectiveStatus(obligation, path, state) {
  const impl = state.obligations?.[obligation.id]
  if (!impl) return undefined
  if (path === null) return impl.status ?? 'mandatory'
  const record = (impl.records ?? []).find((r) => r.fulfilmentId === path)
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
  return records.some((r) => r.fulfilmentId === entry.path)
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

function hasFulfilment(entry, state) {
  const stored = state.fulfilments?.[entry.obligation.id]
  if (entry.path === null) {
    // Singleton obligation — `stored` IS the value being checked.
    return isValueFulfilled(entry.obligation.id, stored)
  }
  // Path-scoped obligation — `stored` is a `{ fulfilmentId: value }`
  // map. If it's not a plain map, the record can't exist.
  if (
    stored === undefined ||
    stored === null ||
    typeof stored !== 'object' ||
    Array.isArray(stored)
  ) {
    return false
  }
  return isValueFulfilled(entry.obligation.id, stored[entry.path])
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

  const touched = inScope.filter((e) => hasAnyInput(e, state))
  const mandatoryInScope = inScope.filter(
    (e) => effectiveStatus(e.obligation, e.path, state) === 'mandatory'
  )
  const mandatoryUnfulfilled = mandatoryInScope.filter(
    (e) => !hasFulfilment(e, state)
  )
  const totalMandatoryConcerns = mandatoryInScope.length + groupErrorCount
  const totalMandatoryUnsatisfied =
    mandatoryUnfulfilled.length + groupErrorCount

  if (totalMandatoryConcerns > 0) {
    if (totalMandatoryUnsatisfied === 0) return STATUSES.FULFILLED
    if (touched.length === 0) return STATUSES.NOT_STARTED
    return STATUSES.IN_PROGRESS
  }
  // Only optional obligations are in scope — Case A.
  if (touched.length === 0) return STATUSES.OPTIONAL
  return STATUSES.FULFILLED
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
  const stored = state.fulfilments?.[entry.obligation.id]
  if (entry.path === null) return !isBlankValue(stored)
  if (
    stored === undefined ||
    stored === null ||
    typeof stored !== 'object' ||
    Array.isArray(stored)
  ) {
    return false
  }
  return !isBlankValue(stored[entry.path])
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
  const inScope = expandPresents(page, state).filter((e) =>
    entryInScope(e, state)
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
      const entries = expandPresents(node, state).filter((e) =>
        entryInScope(e, state)
      )
      out.push(...entries)
      return
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(container)
  return out
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
 *     `records.length` is below the floor. Closes REPORT §7 "No
 *     minimum-instance floor": without this, a group with zero
 *     records collapses to NA and `journeyState → fulfilled` for an
 *     empty consignment. Wired into `commodityLine` (minEntries: 1)
 *     in obligations.js.
 *
 *   - `requires.maxEntries` — collection cap. Symmetric to
 *     minEntries. Emits ONE `{ code: 'MAX_ENTRIES', maxEntries,
 *     actual, errorCode }` when `records.length` exceeds the cap.
 *     Wired into `accompanyingDocument` (maxEntries: 10) — a UI
 *     also enforces the cap on the Add button but the invariant is
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
 *     empty arrays all count as "not filled". This is the primitive
 *     the V4 "accompanying-document Field Block — Optional — All-or-
 *     nothing" rule rides on (Confluence page 6497338582).
 *
 *   - `requires.recordCountEquals` — cross-group per-parent-instance
 *     count check. `{ fieldId, errorCode }`. For each in-scope parent
 *     (`group.within`) instance `parentId`: read the expected count
 *     from `state.fulfilments[fieldId][parentId]`, skip when blank
 *     (relies on the field's own mandatory rule to catch the missing
 *     case), count `records` whose `fulfilmentId.startsWith(parentId
 *     + '/')`, emit one error per mismatch. Wired into `unitRecord`
 *     (`fieldId = numberOfAnimals.id`) so the count of animals on a
 *     commodity line matches the trader's declared quantity.
 *
 * All five rule shapes contribute uniformly to `classifyEntries`'
 * `groupErrorCount` — an unmet floor / cap / anyOf / all-or-nothing
 * / count-mismatch blocks F identically.
 */
export function groupInvariantErrors(group, state) {
  if (!group?.requires) return []
  const groupImpl = state.obligations?.[group.id]
  if (!groupImpl?.inScope) return []
  const errors = []
  const records = groupImpl.records ?? []
  const { minEntries, maxEntries, errorCode } = group.requires
  if (typeof minEntries === 'number' && records.length < minEntries) {
    errors.push({
      code: 'MIN_ENTRIES',
      groupId: group.id,
      groupName: group.name,
      errorCode,
      minEntries,
      actual: records.length
    })
  }
  if (typeof maxEntries === 'number' && records.length > maxEntries) {
    errors.push({
      code: 'MAX_ENTRIES',
      groupId: group.id,
      groupName: group.name,
      errorCode: group.requires.maxEntriesErrorCode ?? errorCode,
      maxEntries,
      actual: records.length
    })
  }
  if (group.requires.anyOfIds) {
    for (const record of records) {
      const instanceId = record.fulfilmentId
      const inScopeLeafIds = group.requires.anyOfIds.filter((leafId) => {
        const impl = state.obligations?.[leafId]
        if (!impl?.inScope) return false
        return (impl.records ?? []).some((r) => r.fulfilmentId === instanceId)
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
  }
  if (group.requires.allOrNothingOfIds) {
    const memberIds = group.requires.allOrNothingOfIds
    const filledIds = memberIds.filter(
      (id) => !isBlankValue(state.fulfilments?.[id])
    )
    if (filledIds.length > 0 && filledIds.length < memberIds.length) {
      const missingIds = memberIds.filter((id) =>
        isBlankValue(state.fulfilments?.[id])
      )
      errors.push({
        code: group.requires.errorCode,
        groupId: group.id,
        groupName: group.name,
        missingIds
      })
    }
  }
  if (group.requires.recordCountEquals && group.within) {
    const { fieldId, errorCode: countErrorCode } =
      group.requires.recordCountEquals
    const parentImpl = state.obligations?.[group.within.id]
    const parentRecords = parentImpl?.records ?? []
    for (const parentRec of parentRecords) {
      const parentId = parentRec.fulfilmentId
      const expected = state.fulfilments?.[fieldId]?.[parentId]
      if (isBlankValue(expected)) continue
      const actual = records.filter((r) =>
        r.fulfilmentId.startsWith(`${parentId}/`)
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
  }
  return errors
}

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
 *     scalar-storage field blocks (e.g. the accompanyingDocument
 *     all-or-nothing block).
 */
function collectGroupsPresentedIn(container) {
  const groups = new Map()
  const visit = (node) => {
    if (node.presentsForEach?.forEachOf) {
      const g = node.presentsForEach.forEachOf
      groups.set(g.id, g)
    }
    for (const entry of node.presents ?? []) {
      for (const c of entry.obligation?.containers ?? []) {
        groups.set(c.id, c)
      }
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
