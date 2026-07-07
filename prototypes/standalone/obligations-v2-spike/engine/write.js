import { currentJourney } from './journey.js'
import { reconcile } from './evaluate/reconcile.js'
import { makeScope } from './read.js'
import { records } from './persistence/records.js'
import { setAt, valueAt, destroyWiped } from '../lib/path.js'

/**
 * There is deliberately NO `setScope` and NO `delete(otherObligation)` —
 * scope-exit wipe is derived by `reconcile` alone and applied by
 * `destroyWiped`, so a page physically cannot hand-roll a wipe.
 */

/**
 * True only for a real in-range integer index into `list`. `Number.isInteger`
 * rejects `NaN` and non-integers UP FRONT: without it `splice(NaN, 1)` coerces
 * to `splice(0, 1)` and would destroy the WRONG (first) instance on a malformed
 * `.../foo/remove` URL. Guards edit-in-place and remove alike.
 */
const isValidIndex = (index, list) =>
  Number.isInteger(index) && index >= 0 && index < list.length

export const commit = (request, h, patch) => {
  const journey = currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)
  records.saveAnswers(journey.journeyId, answers)
  return { answers, scope: makeScope(answers) }
}

/**
 * No reconcile here: an append only adds scope, never removes it, so nothing
 * can be wiped by adding.
 */
export const appendEntryAt = (request, h, collectionPath, entry) => {
  const journey = currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  const answers = setAt(journey.answers, collectionPath, [...list, entry])
  records.saveAnswers(journey.journeyId, answers)
  return list.length
}

export const updateEntryAt = (request, h, collectionPath, index, entry) => {
  const journey = currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  if (!isValidIndex(index, list)) return
  const answers = setAt(
    journey.answers,
    collectionPath,
    list.with(index, entry)
  )
  records.saveAnswers(journey.journeyId, answers)
}

/**
 * Splice destroys the whole subtree, then reconcile prunes anything left
 * dangling out of scope — removal is destroyed-not-hidden.
 */
export const removeEntryAt = (request, h, collectionPath, index) => {
  const journey = currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  if (!isValidIndex(index, list)) return
  const answers = setAt(
    journey.answers,
    collectionPath,
    list.toSpliced(index, 1)
  )
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)
  records.saveAnswers(journey.journeyId, answers)
}

export const appendEntry = (request, h, obligationId, entry) =>
  appendEntryAt(request, h, [obligationId], entry)

export const updateEntry = (request, h, obligationId, index, entry) =>
  updateEntryAt(request, h, [obligationId], index, entry)

export const removeEntry = (request, h, obligationId, index) =>
  removeEntryAt(request, h, [obligationId], index)

export const submitJourney = (request, h) => {
  const journey = currentJourney(request, h)
  const scope = makeScope(journey.answers)
  if (!scope.readyForQuote) return { ok: false, journey, scope }
  const submitted = records.finalise(journey.journeyId)
  return { ok: true, journey: submitted, scope }
}
