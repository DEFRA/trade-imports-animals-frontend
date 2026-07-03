import { currentJourney } from './journey.js'
import { reconcile } from './reconcile.js'
import { entryComplete, readyForQuote } from './status.js'
import { store } from './store.js'
import { deleteAt, parsePath, valueAt } from '../lib/path.js'
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
