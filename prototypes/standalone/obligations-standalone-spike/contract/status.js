import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateObligations, loadJourneyModel } from '../engine/index.js'
import {
  containerStatus,
  journeyState as flowJourneyState,
  FULFILLED,
  SUBMITTED
} from '../flow-eval/index.js'
import { makeReference } from '../lib/quote/index.js'

/**
 * The evaluation spine — one per-request `evaluate(journey)` composing
 * prune + the ObligationEvaluator + Container statuses + journey state
 * into the single deep-frozen evaluation object every other contract
 * file (and every route) consumes. Exact key set, pinned by test:
 *
 *   { journeyId, reference, submitted, submittedAt, journeyState,
 *     canSubmit, obligations, fulfilments, drops,
 *     containerStatuses: { groups, pages } }
 *
 * `obligations` + `fulfilments` are the EvaluationResult halves the
 * flow-eval primitives take as-is; `containerStatuses` is two maps
 * because a Group and a Page may share an id (the email Section wraps
 * the email Page). `canSubmit` is true iff Fulfilled — the
 * Accept-and-get-quote gate, hard only at CYA POST (Rulings item 2).
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const flowPath = path.join(dirname, '..', 'model', 'flow.json')
let cachedFlow

const deepFreeze = (value) => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

/** The polished Flow, read once and frozen (model/flow.json). */
export function journeyFlow() {
  cachedFlow ??= deepFreeze(JSON.parse(fs.readFileSync(flowPath, 'utf8')))
  return cachedFlow
}

/** The validated journey catalogue: `{ obligations, identifiers }`. */
export function journeyModel() {
  return loadJourneyModel()
}

const findPageIn = (container, pageId) => {
  if (container.kind === 'page') {
    return container.id === pageId ? container : null
  }
  return (container.children ?? []).reduce(
    (found, child) => found ?? findPageIn(child, pageId),
    null
  )
}

/** Resolve one Page by id anywhere in the Container tree; throws. */
export function pageById(pageId, flow = journeyFlow()) {
  const page = flow.sections.reduce(
    (found, section) => found ?? findPageIn(section, pageId),
    null
  )
  if (!page) {
    throw new Error(`Unknown page "${pageId}"`)
  }
  return page
}

/** The top-level Section whose subtree presents the given Page; throws. */
export function sectionOfPage(pageId, flow = journeyFlow()) {
  const section = flow.sections.find((candidate) =>
    Boolean(findPageIn(candidate, pageId))
  )
  if (!section) {
    throw new Error(`No section presents page "${pageId}"`)
  }
  return section
}

/**
 * Obligation state over an arbitrary fulfilments map — the candidate
 * seam behind contract/mutation.js's payload-merged save gate.
 */
export function obligationStateOver(fulfilments, options = {}) {
  const { obligations = journeyModel().obligations, ...rest } = options
  const { scopeRegistry, externalState } = rest
  return evaluateObligations(obligations, fulfilments, {
    scopeRegistry,
    externalState
  }).obligations
}

const collectStatuses = (container, evaluation, options, groups, pages) => {
  const status = containerStatus(container, evaluation, options)
  if (container.kind === 'page') {
    pages[container.id] = status
    return
  }
  groups[container.id] = status
  for (const child of container.children ?? []) {
    collectStatuses(child, evaluation, options, groups, pages)
  }
}

/** Run both evaluators over one journey; returns the frozen evaluation. */
export function evaluate(journey, options = {}) {
  const {
    flow = journeyFlow(),
    obligations = journeyModel().obligations,
    scopeRegistry,
    externalState,
    conditions
  } = options
  const result = evaluateObligations(obligations, journey.fulfilments, {
    scopeRegistry,
    externalState
  })
  const statusOptions = { conditions }
  const groups = {}
  const pages = {}
  for (const section of flow.sections) {
    collectStatuses(section, result, statusOptions, groups, pages)
  }
  const submitted = journey.status === SUBMITTED
  const state = flowJourneyState(flow, result, { conditions, submitted })
  return deepFreeze({
    journeyId: journey.journeyId,
    reference: makeReference(journey.journeyId),
    submitted,
    submittedAt: journey.submittedAt ?? null,
    journeyState: state,
    canSubmit: state === FULFILLED,
    obligations: result.obligations,
    fulfilments: result.fulfilments,
    drops: result.drops,
    containerStatuses: { groups, pages }
  })
}

/** Lifecycle state of an already-computed evaluation. */
export const journeyState = (evaluation) => evaluation.journeyState

/** The Accept-and-get-quote gate: true iff the journey is Fulfilled. */
export const canSubmit = (evaluation) => evaluation.canSubmit
