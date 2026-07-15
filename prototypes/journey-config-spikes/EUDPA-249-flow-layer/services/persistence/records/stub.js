/**
 * In-memory stub backing for the records port.
 *
 * Ported from A's `services/persistence/records/stub.js` (see
 * /tmp/A-records-stub.js). Reshaped for B's persistence model:
 * A stored per-user journey documents keyed by `journeyId`; B stores
 * the fulfilments map (`{ [obligationId]: value | { [instanceKey]:
 * value } }`) as a single blob — the same shape `lib/state.js` writes
 * against `SESSION_KEY` today.
 *
 * The load-bearing invariant of THIS port is delete-by-omission:
 * to remove a record, the caller calls `save(newMap)` with the key
 * absent. The port surface intentionally exposes NO per-key delete
 * (no `deleteRecord`, no `deleteWithinGroup`) — see BRIEF §Migration
 * #4 and REPORT §5.1 "the no-per-key-delete records port". REPORT
 * §5.2 also notes: "whole-map replace = delete-by-omission; pages
 * already delete" — B's `lib/state.js` already writes the whole
 * fulfilments blob on every mutation, so formalising the port as a
 * whole-map replace matches the persistence semantics session code
 * has quietly implemented all along.
 *
 * NOT wired into `lib/state.js` or the evaluator yet — this commit
 * introduces the abstraction only. Wiring happens in Phase 6 alongside
 * the Mongo backing (see PLAN.md §10).
 *
 * See PLAN.md §8 Phase 4 commit 1.
 */

// The whole fulfilments map — single blob, keyed by obligationId.
let store = {}

export const records = {
  /**
   * Read the whole fulfilments map. Returns a clone so callers can
   * mutate freely without corrupting the backing store — mirrors A's
   * `structuredClone` guard.
   */
  async load() {
    return structuredClone(store)
  },

  /**
   * Whole-map replace. This is the ONLY way to remove records from the
   * store — omit the key from `next` and it is gone. Clones the input
   * to isolate the backing store from later external mutation.
   */
  async save(next) {
    store = structuredClone(next ?? {})
  },

  /**
   * Get one record by obligation id. Returns the raw value for leaf
   * obligations, or the inner instance-keyed map for group obligations
   * (see `allWithinGroup` for a group-friendlier accessor). Undefined
   * when unseeded.
   */
  async getRecord(obligationId) {
    const value = store[obligationId]
    return value === undefined ? undefined : structuredClone(value)
  },

  /**
   * Put one record. Whole-map safe: reads the current map, sets the
   * one key, writes it back. Delete-by-omission still applies for
   * removal — this method never accepts an "unset" sentinel.
   */
  async putRecord(obligationId, value) {
    store = { ...store, [obligationId]: structuredClone(value) }
  },

  /**
   * Return the instance-keyed inner map for a group obligation
   * (e.g. `commodityLine.id` → `{ line1: 'seed', line2: 'seed' }`).
   * Returns `{}` if the group has never been seeded — callers can
   * safely `Object.keys()` the result.
   */
  async allWithinGroup(groupObligationId) {
    const stored = store[groupObligationId]
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return structuredClone(stored)
    }
    return {}
  },

  /**
   * Put one instance into a group obligation's inner map. Preserves
   * sibling instances. Delete-by-omission still applies — to remove
   * an instance, call `save()` with a fresh inner map that omits the
   * instanceKey.
   */
  async putGroupRecord(groupObligationId, instanceKey, value) {
    const currentGroup =
      store[groupObligationId] &&
      typeof store[groupObligationId] === 'object' &&
      !Array.isArray(store[groupObligationId])
        ? store[groupObligationId]
        : {}
    store = {
      ...store,
      [groupObligationId]: {
        ...currentGroup,
        [instanceKey]: structuredClone(value)
      }
    }
  },

  /**
   * Reset the whole store to empty. Test-only equivalent of A's
   * `records.clear()`. Kept on the port surface so the contract test
   * can express its `beforeEach` reset.
   */
  async clear() {
    store = {}
  }
}
