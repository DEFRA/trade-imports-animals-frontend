/**
 * Two-dimensional mandate composition (obligations.md:1047-1099). The
 * Flow's page-level mandate ('hard' | 'soft', soft default) and the
 * engine's journey-completion mandate ('mandatory' | 'optional') compose
 * orthogonally; most restrictive wins. Per Rulings item 3 the only
 * page-hard entry anywhere is fullName — every other gap saves freely and
 * blocks at CYA POST through `unfulfilledMandatory`.
 *
 * Deliberately no evaluate.js import: these helpers read
 * EvaluationResult-shaped data ({ inScope, status, fulfilled, reasons })
 * and the shape agreement is pinned by test.
 */

export const PAGE_MANDATES = Object.freeze(['hard', 'soft'])
export const ENGINE_MANDATES = Object.freeze(['mandatory', 'optional'])

/** The four-row composition table, verbatim from the doc (1067-1072). */
export const MANDATE_COMPOSITION = Object.freeze([
  {
    page: 'hard',
    engine: 'mandatory',
    blocksSave: true,
    blocksCompletion: true,
    effect: 'Must fill here AND required for Journey completion'
  },
  {
    page: 'hard',
    engine: 'optional',
    blocksSave: true,
    blocksCompletion: false,
    effect: 'Must fill on this page even though the Journey does not need it'
  },
  {
    page: 'soft',
    engine: 'mandatory',
    blocksSave: false,
    blocksCompletion: true,
    effect: 'Can skip on this page; needed before the Journey can complete'
  },
  {
    page: 'soft',
    engine: 'optional',
    blocksSave: false,
    blocksCompletion: false,
    effect: 'No constraint at either level'
  }
])

/** Resolve one composition row; page mandate defaults soft, engine optional. */
export const composeMandate = (
  pageMandate = 'soft',
  engineStatus = 'optional'
) => {
  const row = MANDATE_COMPOSITION.find(
    (candidate) =>
      candidate.page === pageMandate && candidate.engine === engineStatus
  )
  if (!row) {
    throw new Error(`Unknown mandate pair "${pageMandate}" x "${engineStatus}"`)
  }
  return row
}

/**
 * Save-time gate for one page entry: only a hard page mandate on an
 * in-scope, unfulfilled obligation blocks Save and continue.
 */
export const blocksSave = (pageMandate, obligationEntry) =>
  composeMandate(pageMandate, obligationEntry.status).blocksSave &&
  obligationEntry.inScope &&
  !obligationEntry.fulfilled

/**
 * The CYA-POST hard gate (and the soft-prompt list): every in-scope,
 * engine-mandatory, unfulfilled obligation with its stacked reasons —
 * including the zero-claims 'Add at least one claim' case.
 */
export const unfulfilledMandatory = (evaluation) =>
  Object.entries(evaluation.obligations)
    .filter(
      ([, entry]) =>
        entry.inScope && entry.status === 'mandatory' && !entry.fulfilled
    )
    .map(([obligationId, entry]) => ({
      obligationId,
      name: entry.name,
      reasons: entry.reasons
    }))

/**
 * The three per-journey completion policies (obligations.md:201). This
 * journey runs gate-collected-at-end — gaps are collected at CYA POST.
 */
export const COMPLETION_POLICIES = Object.freeze([
  'silently-skipped',
  'must-address',
  'gate-collected-at-end'
])

export const JOURNEY_COMPLETION_POLICY = 'gate-collected-at-end'

/** Per-journey default with per-obligation override. */
export const resolveCompletionPolicy = (journeyDefault, obligationOverride) => {
  const policy = obligationOverride ?? journeyDefault
  if (!COMPLETION_POLICIES.includes(policy)) {
    throw new Error(`Unknown completion policy "${policy}"`)
  }
  return policy
}
