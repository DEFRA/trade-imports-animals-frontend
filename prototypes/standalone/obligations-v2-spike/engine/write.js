import { currentJourney } from './journey.js'
import { reconcile } from './reconcile.js'
import { makeScope } from './read.js'
import { records } from './persistence/records.js'
import { setAt, valueAt, destroyWiped } from '../lib/path.js'

/**
 * The WRITE side of the narrow state facade: pages write answers DOWN and the
 * layer reconciles + persists. There is deliberately NO `setScope` and NO
 * `delete(otherObligation)` — scope-exit wipe is derived by `reconcile` alone
 * and applied by `destroyWiped`, so a page physically cannot hand-roll a wipe.
 */

/** Apply a scalar patch, reconcile to a fixpoint, DESTROY wiped data, persist.
 * `wiped` is path-addressed now, so a nested instance can be destroyed in place;
 * a depth-0 key still deletes the whole top-level obligation. `destroyWiped`
 * orders the deletes so sibling array-index splices run highest-index-first and
 * a nested delete precedes its container's — no delete ever shifts another. */
export const commit = (request, h, patch) => {
  const journey = currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)
  records.saveAnswers(journey.journeyId, answers)
  return { answers, scope: makeScope(answers) }
}

/**
 * Append one entry to an indexed obligation at ANY depth — MINTS its index
 * (identity). `collectionPath` addresses the collection (`['claims']` at the
 * root, `['drivers', 1, 'claims']` for a nested sub-hub), so the same primitive
 * drives a loop and a loop-inside-a-loop. No reconcile here: an append only adds
 * scope, never removes it, so nothing can be wiped by adding.
 */
export const appendEntryAt = (request, h, collectionPath, entry) => {
  const journey = currentJourney(request, h)
  const list = valueAt(journey.answers, collectionPath) ?? []
  const answers = setAt(journey.answers, collectionPath, [...list, entry])
  records.saveAnswers(journey.journeyId, answers)
  return list.length
}

/** Replace the entry at `[...collectionPath, index]` (edit-in-place at depth). */
export const updateEntryAt = (request, h, collectionPath, index, entry) => {
  const journey = currentJourney(request, h)
  const list = [...(valueAt(journey.answers, collectionPath) ?? [])]
  if (!Number.isInteger(index) || index < 0 || index >= list.length) return
  list[index] = entry
  const answers = setAt(journey.answers, collectionPath, list)
  records.saveAnswers(journey.journeyId, answers)
}

/**
 * Remove the entry at `[...collectionPath, index]`. Splicing an entry destroys
 * its whole subtree (a driver's nested claims go with the driver), then a
 * reconcile prunes anything left dangling out of scope — so removal at depth is
 * destroyed-not-hidden, per instance, exactly like the root case.
 */
export const removeEntryAt = (request, h, collectionPath, index) => {
  const journey = currentJourney(request, h)
  const list = [...(valueAt(journey.answers, collectionPath) ?? [])]
  // Reject a non-integer index: `splice(NaN, 1)` coerces to `splice(0, 1)` and
  // would destroy the WRONG (first) instance on a malformed `.../foo/remove` URL.
  if (!Number.isInteger(index) || index < 0 || index >= list.length) return
  list.splice(index, 1)
  const answers = setAt(journey.answers, collectionPath, list)
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)
  records.saveAnswers(journey.journeyId, answers)
}

/** Single-level convenience wrappers — a bare obligation id is a depth-0 path. */
export const appendEntry = (request, h, obligationId, entry) =>
  appendEntryAt(request, h, [obligationId], entry)

export const updateEntry = (request, h, obligationId, index, entry) =>
  updateEntryAt(request, h, [obligationId], index, entry)

export const removeEntry = (request, h, obligationId, index) =>
  removeEntryAt(request, h, [obligationId], index)

/** Server-side submit — flip to submitted (freezes writes) after a re-check. */
export const submitJourney = (request, h) => {
  const journey = currentJourney(request, h)
  const scope = makeScope(journey.answers)
  if (!scope.readyForQuote) return { ok: false, journey, scope }
  const submitted = records.finalise(journey.journeyId)
  return { ok: true, journey: submitted, scope }
}
