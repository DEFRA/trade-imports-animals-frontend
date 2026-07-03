import { currentJourney } from './journey.js'
import { reconcile } from './reconcile.js'
import { readyForQuote } from './status.js'
import { store } from './store.js'

/**
 * THE narrow facade every page controller imports. This is the whole
 * one-directional seam: pages write answers DOWN (commit / appendEntry /
 * updateEntry / removeEntry) and read scope + status UP (get). There is
 * deliberately NO `setScope` and NO `delete(otherObligation)` — scope and
 * scope-exit wipe are derived by `reconcile` alone, so a page physically
 * cannot hand-roll a wipe or fake scope.
 */

/** Read-only scope facts, computed fresh from the answers map. */
const makeScope = (answers) => {
  const { inScope } = reconcile(answers)
  return {
    inScope,
    has: (id) => inScope.has(id),
    readyForQuote: readyForQuote(answers, inScope)
  }
}

/** { journey, answers, scope } for a request (load-or-create). */
export const get = (request, h) => {
  const journey = currentJourney(request, h)
  return {
    journey,
    answers: journey.answers,
    scope: makeScope(journey.answers)
  }
}

/** Apply a scalar patch, reconcile to a fixpoint, DESTROY wiped data, persist. */
export const commit = (request, h, patch) => {
  const journey = currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  const { wiped } = reconcile(answers)
  for (const id of wiped) delete answers[id]
  store.saveAnswers(journey.journeyId, answers)
  return { answers, scope: makeScope(answers) }
}

/** Append one entry to an indexed obligation — MINTS its index (identity). */
export const appendEntry = (request, h, obligationId, entry) => {
  const journey = currentJourney(request, h)
  const answers = { ...journey.answers }
  answers[obligationId] = [...(answers[obligationId] ?? []), entry]
  store.saveAnswers(journey.journeyId, answers)
  return answers[obligationId].length - 1
}

export const updateEntry = (request, h, obligationId, index, entry) => {
  const journey = currentJourney(request, h)
  const answers = { ...journey.answers }
  const list = [...(answers[obligationId] ?? [])]
  if (index >= 0 && index < list.length) {
    list[index] = entry
    answers[obligationId] = list
    store.saveAnswers(journey.journeyId, answers)
  }
}

export const removeEntry = (request, h, obligationId, index) => {
  const journey = currentJourney(request, h)
  const answers = { ...journey.answers }
  const list = [...(answers[obligationId] ?? [])]
  if (index >= 0 && index < list.length) {
    list.splice(index, 1)
    answers[obligationId] = list
    store.saveAnswers(journey.journeyId, answers)
  }
}

/** Server-side submit — flip to submitted (freezes writes) after a re-check. */
export const submitJourney = (request, h) => {
  const journey = currentJourney(request, h)
  const scope = makeScope(journey.answers)
  if (!scope.readyForQuote) return { ok: false, journey, scope }
  const submitted = store.submit(journey.journeyId)
  return { ok: true, journey: submitted, scope }
}

export { makeScope }
