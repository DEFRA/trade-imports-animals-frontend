/**
 * Runtime — small pure functions that read (obligations state × domain
 * × flow) and answer one specific question. No stateful evaluator; each
 * primitive stands alone.
 *
 * Two families:
 *
 *   1. JourneyEvaluator primitives (implementing the design captured in
 *      the parent EUDPA-277 spike doc §The JourneyEvaluator):
 *        - pageStatus(page, state)                       → NA / NS / IP / F
 *        - containerStatus(container, state)             → NA / NS / IP / F
 *        - journeyState(flow, state, submitted?)         → NS / IP / F / S
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
 * `{ obligation, path, mandatoryToSaveAndContinue, errors }` entries.
 *
 * `presentsForEach` expands to one virtual entry per group-instance
 * present in the current post-purge state — read from
 * `state.obligations[groupId].records`. When the group has zero in-
 * scope records the page collapses to NA via the pageStatus rule.
 *
 * Flow-level flags (`mandatoryToSaveAndContinue`, `errors`) flow
 * through untouched so `build-field-descriptors` + `validatePagePayload`
 * can consume them. See flow.js for the property semantics.
 */
export function expandPresents(page, state) {
  const out = []
  for (const entry of page.presents ?? []) {
    out.push({
      obligation: entry.obligation,
      path: entry.path ?? null,
      mandatoryToSaveAndContinue: entry.mandatoryToSaveAndContinue ?? false,
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
        mandatoryToSaveAndContinue: forEach.mandatoryToSaveAndContinue ?? false,
        errors: forEach.errors ?? null
      })
    }
  }
  return out
}

const STATUSES = {
  NOT_APPLICABLE: 'not-applicable',
  NOT_STARTED: 'not-started',
  IN_PROGRESS: 'in-progress',
  FULFILLED: 'fulfilled',
  SUBMITTED: 'submitted'
}

// Field / derived-leaf records live in `impl.records[]`, each carrying
// { fulfilmentId, status: 'mandatory' | 'optional' }. Singleton
// implications carry `status` at the top level.
function effectiveStatus(obligation, path, state) {
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

function hasFulfilment(entry, state) {
  const stored = state.fulfilments?.[entry.obligation.id]
  if (entry.path === null) {
    // Singleton obligation — `stored` IS the value being checked.
    return !isBlankValue(stored)
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
  return !isBlankValue(stored[entry.path])
}

/**
 * Page status per Recursive Fulfilled §. A page is:
 *   - NA if no presents entries are in scope (read-only pages qualify);
 *   - F  if every in-scope mandatory entry is fulfilled;
 *   - NS if none of the in-scope entries are fulfilled;
 *   - IP otherwise (some fulfilments present, work still to do).
 */
export function pageStatus(page, state) {
  const entries = expandPresents(page, state)
  const inScope = entries.filter((e) => entryInScope(e, state))
  if (inScope.length === 0) return STATUSES.NOT_APPLICABLE

  const filled = inScope.filter((e) => hasFulfilment(e, state))
  const mandatoryUnfilled = inScope.filter((e) => {
    if (effectiveStatus(e.obligation, e.path, state) !== 'mandatory') {
      return false
    }
    return !hasFulfilment(e, state)
  })

  // Fulfilled iff every in-scope MANDATORY presented entry is filled.
  // The obligation's `status` (mandatory | optional) is completion-
  // mandate: it determines whether the journey needs the field to
  // reach F. An in-scope optional obligation that stays blank does
  // not block F — an optional-only page/subsection therefore rolls
  // up to F immediately once nothing mandatory is in scope, which
  // is the correct model-layer semantic. (Whether the user should
  // still visit such a page before we call it Complete is a
  // separate display-layer question — see NEXT.md parked to-do.)
  if (mandatoryUnfilled.length === 0) {
    return STATUSES.FULFILLED
  }
  if (filled.length === 0) return STATUSES.NOT_STARTED
  return STATUSES.IN_PROGRESS
}

/**
 * Container (Section / SubSection) status per Status-propagation rules.
 * Delegates to pageStatus at leaves.
 *
 * Note: an empty session in a container whose children mix F (from
 * optional-only pages defaulting to F) with NS (mandatories still
 * unfilled) would model as IP, which is misleading — no user action
 * has happened yet. We honour the user's perspective by returning NS
 * until the container has been touched. Same pattern as journeyState.
 */
export function containerStatus(container, state) {
  if (isPage(container)) return pageStatus(container, state)
  const childStatuses = (container.children ?? []).map((c) =>
    containerStatus(c, state)
  )
  const applicable = childStatuses.filter((s) => s !== STATUSES.NOT_APPLICABLE)
  if (applicable.length === 0) return STATUSES.NOT_APPLICABLE
  const hasF = applicable.includes(STATUSES.FULFILLED)
  const hasIP = applicable.includes(STATUSES.IN_PROGRESS)
  const hasNS = applicable.includes(STATUSES.NOT_STARTED)
  if (hasIP) {
    if (!hasFulfilmentInContainer(container, state)) return STATUSES.NOT_STARTED
    return STATUSES.IN_PROGRESS
  }
  if (hasF && hasNS) {
    if (!hasFulfilmentInContainer(container, state)) return STATUSES.NOT_STARTED
    return STATUSES.IN_PROGRESS
  }
  if (hasF) return STATUSES.FULFILLED
  return STATUSES.NOT_STARTED
}

/** True iff any obligation presented under this container has a
 *  non-empty stored value in state.fulfilments. */
function hasFulfilmentInContainer(container, state) {
  const fulfilments = state?.fulfilments ?? {}
  const seen = new Set()
  const visit = (node) => {
    if (node.page !== undefined) {
      for (const entry of node.presents ?? []) {
        seen.add(entry.obligation.id)
      }
      if (node.presentsForEach) {
        seen.add(node.presentsForEach.obligation.id)
      }
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(container)
  for (const oblId of seen) {
    const v = fulfilments[oblId]
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      if (v.length > 0) return true
      continue
    }
    if (typeof v === 'object') {
      if (Object.keys(v).length > 0) return true
      continue
    }
    return true
  }
  return false
}

/**
 * Journey status. `submitted` short-circuits to SUBMITTED — the F→S
 * transition is a user-driven event, not a derivable status.
 */
export function journeyState(flow, state, submitted = false) {
  if (submitted) return STATUSES.SUBMITTED
  const statuses = (flow.sections ?? []).map((s) => containerStatus(s, state))
  const applicable = statuses.filter((s) => s !== STATUSES.NOT_APPLICABLE)
  if (applicable.length === 0) return STATUSES.NOT_STARTED
  if (applicable.every((s) => s === STATUSES.FULFILLED)) {
    return STATUSES.FULFILLED
  }
  if (applicable.every((s) => s === STATUSES.NOT_STARTED)) {
    return STATUSES.NOT_STARTED
  }
  // Optional-only sections (e.g. a References section whose only
  // obligation is completion-optional) model as F immediately, which
  // would otherwise push the empty-session rollup to IP. At journey
  // level we honour the user's perspective: NS until they've filled
  // something. Once any fulfilment lands, we're genuinely IP.
  if (!hasAnyFulfilment(state)) return STATUSES.NOT_STARTED
  return STATUSES.IN_PROGRESS
}

function hasAnyFulfilment(state) {
  const values = Object.values(state?.fulfilments ?? {})
  return values.some((v) => {
    if (v === undefined || v === null || v === '') return false
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object') return Object.keys(v).length > 0
    return true
  })
}

export { STATUSES }
