import { evaluateObligations, loadJourneyModel } from '../engine/index.js'
import { journeyRepository } from '../store/index.js'
import {
  addFulfilment,
  applyAnswers,
  markCollectionReviewed,
  removeFulfilment
} from './apply-answers/index.js'
import { runToFixedPoint } from './fixed-point.js'

/**
 * The orchestrator barrel — the ONLY side-effecting layer. Every mutating
 * path (page POST, ?change=1 change-mode POST, claims add/remove) flows
 * through `commit`: write -> fixed point -> repository.save in one
 * function (the risk-7 invariant), so no path can skip the scope-exit
 * wipe or the system handlers. A submitted journey's repository rejects
 * the save, which is the storage half of the post-submit freeze
 * (Rulings item 1).
 *
 * `options` on every entry point: `{ repository, obligations,
 * scopeRegistry, externalState, handlers }` — all injectable for tests,
 * all defaulting to the real journey model and the app singleton.
 */

export { encodeFieldName, decodeFieldName } from './apply-answers/index.js'
export { runToFixedPoint } from './fixed-point.js'
export { reconcileDerived, wipeOutOfScope } from './scope-exit-wipe.js'
export { createSystemHandlerRun, systemHandlers } from './system-handlers.js'

const settle = (options) => {
  const {
    repository = journeyRepository,
    obligations = loadJourneyModel().obligations,
    ...evaluatorOptions
  } = options
  return { repository, obligations, evaluatorOptions }
}

/** The risk-7 invariant: write -> fixed point -> save, in one place. */
const commit = (
  journey,
  fulfilments,
  { repository, obligations, evaluatorOptions }
) => {
  const outcome = runToFixedPoint(obligations, fulfilments, evaluatorOptions)
  const saved = repository.saveFulfilments(
    journey.journeyId,
    outcome.fulfilments
  )
  return {
    journey: saved,
    evaluation: outcome.evaluation,
    drops: outcome.drops,
    wiped: outcome.wiped
  }
}

/** POST answers for one page (plain and ?change=1 mode take this path). */
export const applyPageAnswers = (journey, page, payload, options = {}) => {
  const deps = settle(options)
  const evaluation = evaluateObligations(
    deps.obligations,
    journey.fulfilments,
    deps.evaluatorOptions
  )
  const written = applyAnswers(deps.obligations, page, evaluation, payload)
  return commit(journey, written, deps)
}

/** Add one row across sibling user-source indexed obligations (a claim). */
export const addIndexedFulfilment = (journey, names, values, options = {}) => {
  const deps = settle(options)
  const { fulfilments, fulfilmentId } = addFulfilment(
    deps.obligations,
    journey.fulfilments,
    names,
    values
  )
  return { ...commit(journey, fulfilments, deps), fulfilmentId }
}

/** Mark user-source indexed collections reviewed (Continue on the list). */
export const markIndexedCollectionReviewed = (journey, names, options = {}) => {
  const deps = settle(options)
  const fulfilments = markCollectionReviewed(
    deps.obligations,
    journey.fulfilments,
    names
  )
  return commit(journey, fulfilments, deps)
}

/** Remove one row (by shared fulfilment id) from sibling obligations. */
export const removeIndexedFulfilment = (
  journey,
  names,
  fulfilmentId,
  options = {}
) => {
  const deps = settle(options)
  const fulfilments = removeFulfilment(
    deps.obligations,
    journey.fulfilments,
    names,
    fulfilmentId
  )
  return commit(journey, fulfilments, deps)
}

/**
 * Reconcile-on-load: run the pass over the stored fulfilments unchanged
 * and persist the amended set — prune drops surface as data for the
 * caller to log (obligations.md:690-720).
 */
export const reconcileJourney = (journey, options = {}) => {
  return commit(journey, journey.fulfilments, settle(options))
}
