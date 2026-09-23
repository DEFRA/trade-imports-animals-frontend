import { currentSetId } from '../../../../../shared/set-context.js'

/**
 * One in-memory store per set, not one shared between them.
 *
 * A single Map would be a set singleton: two sets in one process would list,
 * load and clear each other's drafts, and the second set to mount would see
 * the first set's notifications on its own dashboard. Keying on the active set
 * keeps each set's drafts to itself without changing the stub's own API.
 */
const bySet = new Map()

const storeOf = (setId) => {
  if (!bySet.has(setId)) {
    bySet.set(setId, {
      journeys: new Map(),
      copiesBySourceAndKey: new Map()
    })
  }
  return bySet.get(setId)
}

/** The active set's journeys, by journey id. */
export const journeys = () => storeOf(currentSetId()).journeys

/** The active set's copy dedupe index, by source journey and idempotency key. */
export const copiesBySourceAndKey = () =>
  storeOf(currentSetId()).copiesBySourceAndKey
