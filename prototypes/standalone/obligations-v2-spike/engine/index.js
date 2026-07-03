import { currentJourney } from './journey.js'
import { reconcile } from './reconcile.js'
import { entryComplete, readyForQuote } from './status.js'
import { store } from './store.js'
import { deleteAt, parsePath, setAt, valueAt } from '../lib/path.js'
import { registry } from '../registry.js'

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

/**
 * Order two wipe paths so a `deleteAt` never invalidates a not-yet-applied
 * sibling. `deleteAt` SPLICES an array index, which renumbers later siblings, so
 * two sibling index deletes must run HIGHEST-INDEX-FIRST; and a nested delete
 * must run before the shallower delete that would remove its container. So:
 * at the first differing segment, larger numeric index first; otherwise (a
 * shared prefix) the deeper path first. Disjoint string branches are
 * independent — their order does not matter.
 */
export const wipeOrder = (a, b) => {
  const shared = Math.min(a.length, b.length)
  for (let i = 0; i < shared; i++) {
    if (a[i] === b[i]) continue
    if (typeof a[i] === 'number' && typeof b[i] === 'number') return b[i] - a[i]
    return 0
  }
  return b.length - a.length
}

/** Apply a scalar patch, reconcile to a fixpoint, DESTROY wiped data, persist.
 * `wiped` is path-addressed now, so a nested instance can be destroyed in place;
 * a depth-0 key still deletes the whole top-level obligation. Paths are ordered
 * by `wipeOrder` so sibling array-index splices run highest-index-first and a
 * nested delete precedes its container's — no delete ever shifts another. */
export const commit = (request, h, patch) => {
  const journey = currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  const { wiped } = reconcile(answers)
  const paths = wiped.map(parsePath).sort(wipeOrder)
  for (const path of paths) deleteAt(answers, path)
  store.saveAnswers(journey.journeyId, answers)
  return { answers, scope: makeScope(answers) }
}

/**
 * The reusable LOOP primitive — a page LIBRARY, never a framework. Given a
 * collection's path it returns pure STRUCTURAL FACTS about the live instances:
 * `[{ index, path, entry, complete }]` (`entry` is the raw stored answer — a
 * fact, not presentation). It descends by path, so it works at ANY depth
 * (a driver's nested claims sub-hub is `collectionView(answers, ['drivers', i,
 * 'claims'])`). The line it holds: it emits facts (how many entries, each
 * entry's path, whether each entry is complete) and NOTHING presentational — no
 * hrefs, no labels, no copy, no row view-models, no template. The moment a
 * helper turns these facts into govuk rows it has become the rejected generic
 * engine; the list/entry controllers compose all presentation themselves.
 */
export const collectionView = (answers, collectionPath) => {
  const template = collectionPath
    .filter((seg) => typeof seg === 'string')
    .join('.')
  const def = registry.byPath(template)
  const entries = valueAt(answers, collectionPath) ?? []
  return entries.map((entry, index) => ({
    index,
    path: [...collectionPath, index],
    entry,
    complete: def ? entryComplete(def, entry) : true
  }))
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
  store.saveAnswers(journey.journeyId, answers)
  return list.length
}

/** Replace the entry at `[...collectionPath, index]` (edit-in-place at depth). */
export const updateEntryAt = (request, h, collectionPath, index, entry) => {
  const journey = currentJourney(request, h)
  const list = [...(valueAt(journey.answers, collectionPath) ?? [])]
  if (!Number.isInteger(index) || index < 0 || index >= list.length) return
  list[index] = entry
  const answers = setAt(journey.answers, collectionPath, list)
  store.saveAnswers(journey.journeyId, answers)
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
  for (const path of wiped.map(parsePath).sort(wipeOrder)) {
    deleteAt(answers, path)
  }
  store.saveAnswers(journey.journeyId, answers)
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
  const submitted = store.submit(journey.journeyId)
  return { ok: true, journey: submitted, scope }
}

export { makeScope }
