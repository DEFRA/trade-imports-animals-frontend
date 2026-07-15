/**
 * Contract test — the "records port" abstraction.
 *
 * Adapted from A's `services/persistence/records/records-port.test.js`
 * (see /tmp/A-records-port.test.js). A's port stored per-user journey
 * documents keyed by journeyId; B's port stores the fulfilments map
 * keyed by obligationId (with group obligations holding an inner
 * instance-keyed map — see `lib/state.js` `SESSION_KEY`).
 *
 * The contract-under-test is the shape of the port, NOT the specific
 * A-side lifecycle (mint / finalise / amend — those are B-Phase-6
 * concerns per PLAN.md §10). What we preserve from A's contract:
 *
 *   - write-then-read of a record (put → get round-trips)
 *   - a fresh empty container round-trips (nothing crashes on empty)
 *   - the store has a `clear()` reset (mirrors A `records.clear()`)
 *
 * What we add for B (per PLAN.md §8 line 190-191 + REPORT §5.1):
 *
 *   - delete-by-omission: to remove a record, callers `save()` a fresh
 *     map that omits the key. There is NO `deleteRecord(id)` or
 *     `deleteWithinGroup(id, key)` method on the port surface — the
 *     contract test asserts those methods do not exist.
 *   - group-scoped records: `allWithinGroup(groupObligationId)` returns
 *     the instance-keyed map for a group obligation such as
 *     `commodityLine` or `unitRecord` (empty object if never seeded).
 *   - `putGroupRecord(groupObligationId, instanceKey, value)` writes one
 *     instance into the group; removal is via a subsequent whole-map
 *     `save()` that omits the instanceKey.
 *
 * BRIEF §Migration #4 / REPORT §5.1: the no-per-key-delete records
 * port. Cited also from PLAN.md §8 Phase 4 commit 1.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { records } from './stub.js'
import { commodityLine, unitRecord } from '../../../obligations/obligations.js'

describe('records port — B-shaped (fulfilments map, delete-by-omission)', () => {
  beforeEach(() => records.clear())

  // ---------------------------------------------------------------
  // Preserved from A's contract test (adapted for B's map shape)
  // ---------------------------------------------------------------

  it('Should round-trip a fresh empty container without crashing', async () => {
    expect(await records.load()).toEqual({})
    await records.save({})
    expect(await records.load()).toEqual({})
  })

  it('Should write-then-read a single record — put round-trips through get', async () => {
    await records.putRecord('reasonForImport', 'IMPORT')
    expect(await records.getRecord('reasonForImport')).toBe('IMPORT')
    expect(await records.load()).toEqual({ reasonForImport: 'IMPORT' })
  })

  it('Should reset the whole store on clear() — mirrors A records.clear()', async () => {
    await records.putRecord('reasonForImport', 'IMPORT')
    await records.clear()
    expect(await records.load()).toEqual({})
    expect(await records.getRecord('reasonForImport')).toBeUndefined()
  })

  // ---------------------------------------------------------------
  // B-shaped group records — obligation-id-keyed inner maps
  // ---------------------------------------------------------------

  it('Should return an empty inner map from allWithinGroup for an unseeded group', async () => {
    expect(await records.allWithinGroup(commodityLine.id)).toEqual({})
    expect(await records.allWithinGroup(unitRecord.id)).toEqual({})
  })

  it('Should write per-instance group records via putGroupRecord — commodityLine "line1"', async () => {
    await records.putGroupRecord(commodityLine.id, 'line1', 'seed')
    await records.putGroupRecord(commodityLine.id, 'line2', 'seed')
    expect(await records.allWithinGroup(commodityLine.id)).toEqual({
      line1: 'seed',
      line2: 'seed'
    })
  })

  it('Should support depth-2 composite keys inside a group — unitRecord "line1/unit1"', async () => {
    await records.putGroupRecord(unitRecord.id, 'line1/unit1', 'seed')
    await records.putGroupRecord(unitRecord.id, 'line1/unit2', 'seed')
    expect(await records.allWithinGroup(unitRecord.id)).toEqual({
      'line1/unit1': 'seed',
      'line1/unit2': 'seed'
    })
  })

  // ---------------------------------------------------------------
  // Delete-by-omission — the load-bearing invariant of THIS port
  // (REPORT §5.1 + §5.2 "whole-map replace = delete-by-omission")
  // ---------------------------------------------------------------

  it('Should NOT expose a per-key delete on the port surface', () => {
    expect(records.deleteRecord).toBeUndefined()
    expect(records.deleteWithinGroup).toBeUndefined()
    expect(records.remove).toBeUndefined()
    expect(records.unset).toBeUndefined()
  })

  it('Should remove a top-level record via whole-map save() that omits it', async () => {
    await records.putRecord('reasonForImport', 'IMPORT')
    await records.putRecord('countryOfOrigin', 'FR')

    // Caller reads whole map, produces a new map without the key,
    // and writes back. No per-key delete on the port.
    const current = await records.load()
    const next = { ...current }
    delete next.reasonForImport
    await records.save(next)

    expect(await records.load()).toEqual({ countryOfOrigin: 'FR' })
    expect(await records.getRecord('reasonForImport')).toBeUndefined()
  })

  it('Should remove a group instance via whole-map save() that omits the instanceKey', async () => {
    await records.putGroupRecord(commodityLine.id, 'line1', 'seed')
    await records.putGroupRecord(commodityLine.id, 'line2', 'seed')
    await records.putGroupRecord(commodityLine.id, 'line3', 'seed')

    // Whole-map replace with 'line2' omitted from the inner group map.
    const current = await records.load()
    const nextGroup = { ...current[commodityLine.id] }
    delete nextGroup.line2
    await records.save({ ...current, [commodityLine.id]: nextGroup })

    expect(await records.allWithinGroup(commodityLine.id)).toEqual({
      line1: 'seed',
      line3: 'seed'
    })
  })

  it('Should remove ALL group instances via save() that omits the group obligation id itself', async () => {
    await records.putGroupRecord(commodityLine.id, 'line1', 'seed')
    await records.putGroupRecord(commodityLine.id, 'line2', 'seed')

    const current = await records.load()
    const next = { ...current }
    delete next[commodityLine.id]
    await records.save(next)

    expect(await records.allWithinGroup(commodityLine.id)).toEqual({})
    expect(await records.load()).toEqual({})
  })

  // ---------------------------------------------------------------
  // Isolation — the store must not leak external references
  // (A's stub uses structuredClone; B's stub must too)
  // ---------------------------------------------------------------

  it('Should isolate the stored map from external mutation after save()', async () => {
    const written = { reasonForImport: 'IMPORT', nested: { a: 1 } }
    await records.save(written)

    // Mutating what we handed in must not affect the store
    written.reasonForImport = 'TAMPERED'
    written.nested.a = 999

    expect(await records.getRecord('reasonForImport')).toBe('IMPORT')
    expect((await records.load()).nested).toEqual({ a: 1 })
  })

  it('Should isolate the returned map from external mutation after load()', async () => {
    await records.putRecord('reasonForImport', 'IMPORT')

    const loadedOnce = await records.load()
    loadedOnce.reasonForImport = 'TAMPERED'

    expect(await records.getRecord('reasonForImport')).toBe('IMPORT')
  })

  // ---------------------------------------------------------------
  // Model-agnostic — the port has no knowledge of specific obligations
  // ---------------------------------------------------------------

  it('Should treat any string as a valid key — no allow-list of obligation ids', async () => {
    await records.putRecord('some-unknown-key-not-in-manifest', 42)
    expect(await records.getRecord('some-unknown-key-not-in-manifest')).toBe(42)
  })
})

// ---------------------------------------------------------------------
// Facade contract — the exported `records` binding must satisfy the
// port surface. A's facade dispatches on `isRealMode()` between a stub
// and a Mongo backing (see /tmp/A-records-index.js); B ports only the
// stub for now (real backing is Phase 6 per PLAN.md §10).
// ---------------------------------------------------------------------

describe('records port — facade export', () => {
  beforeEach(() => records.clear())

  it('Should expose the full port surface on the facade re-export', async () => {
    const { records: facade } = await import('./index.js')
    expect(typeof facade.load).toBe('function')
    expect(typeof facade.save).toBe('function')
    expect(typeof facade.getRecord).toBe('function')
    expect(typeof facade.putRecord).toBe('function')
    expect(typeof facade.putGroupRecord).toBe('function')
    expect(typeof facade.allWithinGroup).toBe('function')
    expect(typeof facade.clear).toBe('function')
    // Contract: no per-key delete on the facade either
    expect(facade.deleteRecord).toBeUndefined()
    expect(facade.deleteWithinGroup).toBeUndefined()
  })
})
