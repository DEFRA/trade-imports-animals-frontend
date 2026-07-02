import { expandSlots } from '../flow-eval/index.js'
import {
  addIndexedFulfilment,
  applyPageAnswers,
  encodeFieldName,
  markIndexedCollectionReviewed,
  removeIndexedFulfilment
} from '../orchestrator/index.js'
import {
  candidateValue,
  checkSave as runSaveCheck
} from '../validation/index.js'
import {
  evaluate,
  journeyModel,
  obligationStateOver,
  pageById
} from './status.js'

/**
 * [mutation] — the pure save gate plus the three write entry points.
 * `checkSave` never writes; the writers delegate to the orchestrator
 * (write -> fixed point -> save, the risk-7 invariant) and hand back a
 * FRESH contract evaluation so no caller renders from stale state.
 *
 * The save gate re-scopes over the payload-merged candidate fulfilments:
 * an excessAmount typed in the SAME POST that flips voluntaryExcess to
 * yes is format-checked (the same-POST block), while junk posted to a
 * still-hidden reveal stays out of scope and cannot block its page.
 * Per Rulings item 3 only a hard page mandate (fullName) blocks a save.
 */

/** The `options` keys the orchestrator understands, picked explicitly. */
const orchestratorOptions = ({
  repository,
  obligations,
  scopeRegistry,
  externalState,
  handlers
} = {}) => ({ repository, obligations, scopeRegistry, externalState, handlers })

/** One save-check slot per concrete input: record facts + page mandate. */
const validationSlots = (page, evaluation) => {
  const { identifiers } = journeyModel()
  return expandSlots(page, evaluation).map((slot) => {
    const record = identifiers.recordOfId(slot.obligationId)
    return {
      obligationId: slot.obligationId,
      name: slot.name,
      fulfilmentId: slot.fulfilmentId,
      type: record.type,
      constraints: record.constraints,
      inputName: encodeFieldName(slot.name, slot.fulfilmentId),
      mandate: slot.pageMandate,
      value: slot.value
    }
  })
}

/** Obligation state over the payload-merged candidate fulfilments. */
const candidateState = (slots, payload, evaluation, options) => {
  const fulfilments = structuredClone(evaluation.fulfilments)
  for (const slot of slots) {
    const value = candidateValue(slot, payload)
    if (value === undefined) {
      continue
    }
    fulfilments[slot.obligationId] =
      slot.fulfilmentId === null
        ? { value }
        : {
            ...(fulfilments[slot.obligationId] ?? {}),
            [slot.fulfilmentId]: { value }
          }
  }
  return obligationStateOver(fulfilments, options)
}

/**
 * checkSave(pageId, payload, evaluation) -> { ok, errorSummary,
 * fieldErrors }. `ok` false means the POST must re-render with the GDS
 * error summary instead of writing.
 */
export function checkSave(pageId, payload = {}, evaluation, options = {}) {
  const page = pageById(pageId, options.flow)
  const slots = validationSlots(page, evaluation)
  const state = candidateState(slots, payload, evaluation, options)
  const { blocked, errors, errorSummary } = runSaveCheck(slots, payload, state)
  return { ok: !blocked, errorSummary, fieldErrors: errors }
}

/** POST answers for one page (plain and ?change=1 mode take this path). */
export function applyAnswers(journey, pageId, payload, options = {}) {
  const page = pageById(pageId, options.flow)
  const {
    journey: saved,
    drops,
    wiped
  } = applyPageAnswers(journey, page, payload, orchestratorOptions(options))
  return { journey: saved, evaluation: evaluate(saved, options), drops, wiped }
}

/**
 * Add one row across sibling user-source indexed obligations (a claim
 * spans claimType and claimAmount under ONE minted fulfilment id).
 */
export function addFulfilment(journey, names, values = {}, options = {}) {
  const { journey: saved, fulfilmentId } = addIndexedFulfilment(
    journey,
    [].concat(names),
    values,
    orchestratorOptions(options)
  )
  return { journey: saved, evaluation: evaluate(saved, options), fulfilmentId }
}

/**
 * Mark a user-source indexed collection REVIEWED — the Continue press on
 * its manage list. An empty reviewed collection counts complete on the
 * hub (spike-a's claimsDone, parity ruling c) while the engine's
 * atLeastOne mandate still blocks the CYA POST.
 */
export function markCollectionReviewed(journey, names, options = {}) {
  const { journey: saved } = markIndexedCollectionReviewed(
    journey,
    [].concat(names),
    orchestratorOptions(options)
  )
  return { journey: saved, evaluation: evaluate(saved, options) }
}

/** Remove one row (by shared fulfilment id) from sibling obligations. */
export function removeFulfilment(journey, names, fulfilmentId, options = {}) {
  const { journey: saved } = removeIndexedFulfilment(
    journey,
    [].concat(names),
    fulfilmentId,
    orchestratorOptions(options)
  )
  return { journey: saved, evaluation: evaluate(saved, options) }
}
