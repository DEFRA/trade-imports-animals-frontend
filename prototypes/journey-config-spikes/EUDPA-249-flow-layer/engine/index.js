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
 * `{ obligation, path, mandate }` entries.
 *
 * `presentsForEach` expands to one virtual entry per group-instance
 * present in the current post-purge state — read from
 * `state.obligations[groupId].records`. When the group has zero in-
 * scope records the page collapses to NA via the pageStatus rule.
 */
export function expandPresents(page, state) {
  const out = []
  for (const entry of page.presents ?? []) {
    out.push({
      obligation: entry.obligation,
      path: entry.path ?? null,
      mandate: entry.mandate ?? 'soft'
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
        mandate: forEach.mandate ?? 'soft'
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
  if (stored === undefined || stored === null) return false
  if (entry.path === null) {
    if (typeof stored === 'string') return stored.length > 0
    if (Array.isArray(stored)) return stored.length > 0
    if (typeof stored === 'object') return Object.keys(stored).length > 0
    return true
  }
  if (typeof stored !== 'object' || Array.isArray(stored)) return false
  const record = stored[entry.path]
  if (record === undefined || record === null) return false
  if (typeof record === 'string') return record.length > 0
  if (Array.isArray(record)) return record.length > 0
  return true
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

  // Fulfilled iff (a) every in-scope mandatory presented entry is
  // filled AND (b) at least one entry is filled. The "at least one"
  // condition prevents optional-only subsections from turning up as
  // F on session start before the user has actually done anything.
  if (mandatoryUnfilled.length === 0 && filled.length > 0) {
    return STATUSES.FULFILLED
  }
  if (filled.length === 0) return STATUSES.NOT_STARTED
  return STATUSES.IN_PROGRESS
}

/**
 * Container (Section / SubSection) status per Status-propagation rules.
 * Delegates to pageStatus at leaves.
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
  if (hasIP) return STATUSES.IN_PROGRESS
  if (hasF && hasNS) return STATUSES.IN_PROGRESS
  if (hasF) return STATUSES.FULFILLED
  return STATUSES.NOT_STARTED
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
  return STATUSES.IN_PROGRESS
}

export { STATUSES }
