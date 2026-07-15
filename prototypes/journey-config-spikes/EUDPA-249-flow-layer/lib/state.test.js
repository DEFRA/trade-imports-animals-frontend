/**
 * Unit tests for the state helpers. Focused on the depth-2 unit-record
 * ops introduced in iteration 9 Phase A — addUnitRecord /
 * deleteUnitRecord + the per-line unit-id counter — plus a regression
 * around deleteCommodityLine cascading into unit records.
 *
 * The addCommodityLine / writeAnswer paths are already exercised end-
 * to-end by the e2e-walk + e2e-commodity-lines suites; we don't
 * duplicate that here.
 */

import { describe, it, expect } from 'vitest'

import {
  addUnitRecord,
  deleteUnitRecord,
  deleteCommodityLine,
  readFulfilments,
  readState,
  writeFulfilments,
  SESSION_KEY,
  NEXT_LINE_ID_KEY,
  NEXT_UNIT_ID_BY_LINE_KEY
} from './state.js'
import {
  reasonForImport,
  purposeInInternalMarket
} from '../obligations/obligations.js'

// Minimal in-memory yar impl matching the read/write/clear surface
// state.js uses. Sufficient for these tests without pulling in @hapi.
function makeRequest() {
  const store = new Map()
  return {
    yar: {
      get: (k) => store.get(k),
      set: (k, v) => store.set(k, v),
      clear: (k) => store.delete(k)
    },
    // Escape hatch for tests to seed / inspect raw state without going
    // through the state.js wrappers.
    _store: store
  }
}

// Synthetic obligations — same discipline as engine/index.test.js.
// unitRecord is `within: commodityLine`; permanentAddress and passport
// are both `within: unitRecord`.
const permanentAddress = {
  id: 'ob-permanent-address',
  name: 'permanentAddress'
}
const passport = { id: 'ob-passport', name: 'passport' }
const commodityCode = { id: 'ob-commodity-code', name: 'commodityCode' }

describe('addUnitRecord', () => {
  it('mints unit1 for a fresh line and seeds the composite key', () => {
    const request = makeRequest()
    const unitId = addUnitRecord(request, 'line1', permanentAddress)
    expect(unitId).toBe('unit1')
    expect(readFulfilments(request)).toEqual({
      [permanentAddress.id]: { 'line1/unit1': '' }
    })
  })

  it('increments the per-line counter across adds on the same line', () => {
    const request = makeRequest()
    expect(addUnitRecord(request, 'line1', permanentAddress)).toBe('unit1')
    expect(addUnitRecord(request, 'line1', permanentAddress)).toBe('unit2')
    expect(addUnitRecord(request, 'line1', permanentAddress)).toBe('unit3')
    const stored = readFulfilments(request)[permanentAddress.id]
    expect(Object.keys(stored).sort()).toEqual([
      'line1/unit1',
      'line1/unit2',
      'line1/unit3'
    ])
  })

  it('keeps per-line counters independent — line2 starts at unit1', () => {
    const request = makeRequest()
    addUnitRecord(request, 'line1', permanentAddress)
    addUnitRecord(request, 'line1', permanentAddress)
    expect(addUnitRecord(request, 'line2', permanentAddress)).toBe('unit1')
    expect(addUnitRecord(request, 'line1', permanentAddress)).toBe('unit3')
  })

  it('preserves prior fulfilments on the seed obligation', () => {
    const request = makeRequest()
    request.yar.set(SESSION_KEY, {
      [permanentAddress.id]: { 'line1/unit1': { addressLine1: '10 High St' } }
    })
    request.yar.set(NEXT_UNIT_ID_BY_LINE_KEY, { line1: 2 })
    expect(addUnitRecord(request, 'line1', permanentAddress)).toBe('unit2')
    const stored = readFulfilments(request)[permanentAddress.id]
    expect(stored['line1/unit1']).toEqual({ addressLine1: '10 High St' })
    expect(stored['line1/unit2']).toBe('')
  })
})

describe('deleteUnitRecord', () => {
  it('drops every unit-scoped leaf for the composite key', () => {
    const request = makeRequest()
    // Seed two units on line1 with values on two unit-scoped
    // obligations.
    request.yar.set(SESSION_KEY, {
      [permanentAddress.id]: {
        'line1/unit1': { addressLine1: '10 High St' },
        'line1/unit2': { addressLine1: '20 Low St' }
      },
      [passport.id]: {
        'line1/unit1': 'PP-001',
        'line1/unit2': 'PP-002'
      }
    })
    deleteUnitRecord(request, 'line1', 'unit1', [permanentAddress, passport])
    const stored = readFulfilments(request)
    // unit1 is gone from both leaf obligations; unit2 remains.
    expect(stored[permanentAddress.id]).toEqual({
      'line1/unit2': { addressLine1: '20 Low St' }
    })
    expect(stored[passport.id]).toEqual({ 'line1/unit2': 'PP-002' })
  })

  it('removes the obligation entirely when its last unit is deleted', () => {
    const request = makeRequest()
    request.yar.set(SESSION_KEY, {
      [permanentAddress.id]: { 'line1/unit1': { addressLine1: '10 High St' } }
    })
    deleteUnitRecord(request, 'line1', 'unit1', [permanentAddress])
    expect(readFulfilments(request)).toEqual({})
  })

  it('does not touch a different line', () => {
    const request = makeRequest()
    request.yar.set(SESSION_KEY, {
      [permanentAddress.id]: {
        'line1/unit1': { name: 'A' },
        'line2/unit1': { name: 'B' }
      }
    })
    deleteUnitRecord(request, 'line1', 'unit1', [permanentAddress])
    expect(readFulfilments(request)[permanentAddress.id]).toEqual({
      'line2/unit1': { name: 'B' }
    })
  })
})

describe('readState — persists purge write-back to yar storage', () => {
  // BRIEF §Migration #1 + REPORT §7 (Side B bugs): an out-of-scope
  // answer must be actively cleared from persistent storage per
  // obligations.md §Scope exit ("actively cleared") and the
  // `appliesWhen` semantic (obligations.md:659-661). Today
  // `readState` computes the purged view via `evaluateState` but
  // discards it — only the render sees the purge, the yar store
  // still holds the stale value, so the answer resurrects on the
  // next gate flip-back.
  //
  // Pair used: `purposeInInternalMarket` (purge-on-flip) gated by
  // `reasonForImport === 'internal-market'`. Flip the gate off and
  // the persisted purpose must be gone from storage.
  //
  // NOTE: this commit only fixes the write-back half. The `applyTo`
  // reorder (evaluator pre-purge staleness) is Phase 1 commit 2 —
  // see PLAN.md §5.
  it('write-back: flipping a gate closed drops the dependent from raw storage', () => {
    const request = makeRequest()
    // Seed: gate open, dependent answered.
    writeFulfilments(request, {
      [reasonForImport.id]: 'internal-market',
      [purposeInInternalMarket.id]: 'sale'
    })

    // Baseline: dependent visible in state.
    const baseline = readState(request)
    expect(baseline.fulfilments[purposeInInternalMarket.id]).toBe('sale')

    // Flip gate closed → dependent goes out of scope.
    writeFulfilments(request, {
      [reasonForImport.id]: 'transit',
      [purposeInInternalMarket.id]: 'sale'
    })

    // Read state — purge takes effect on the returned view AND the
    // persisted store.
    const afterClose = readState(request)
    expect(afterClose.fulfilments[purposeInInternalMarket.id]).toBeUndefined()
    // The load-bearing assertion: the raw yar store no longer holds
    // the stale answer. Prior to the write-back fix this line failed
    // — the render was purged but storage was not.
    expect(readFulfilments(request)[purposeInInternalMarket.id]).toBeUndefined()
  })

  it('no-resurrection: flipping the gate back open does NOT rehydrate the purged answer', () => {
    const request = makeRequest()
    writeFulfilments(request, {
      [reasonForImport.id]: 'internal-market',
      [purposeInInternalMarket.id]: 'sale'
    })
    readState(request) // baseline read (no purge — gate open)

    // Close the gate. `readState` must actively clear the purpose.
    writeFulfilments(request, {
      [reasonForImport.id]: 'transit',
      [purposeInInternalMarket.id]: 'sale'
    })
    readState(request) // triggers purge write-back

    // Re-open the gate — dependent was never re-answered.
    const current = { ...readFulfilments(request) }
    current[reasonForImport.id] = 'internal-market'
    writeFulfilments(request, current)

    const reopened = readState(request)
    // If the purge was persisted, the dependent is now blank — the
    // user must re-answer. If it was NOT persisted, the pre-purge
    // value 'sale' resurrects here (this is the bug).
    expect(reopened.fulfilments[purposeInInternalMarket.id]).toBeUndefined()
    expect(readFulfilments(request)[purposeInInternalMarket.id]).toBeUndefined()
  })
})

describe('deleteCommodityLine — cascades into unit records', () => {
  it('purges every unit fulfilment whose composite key starts with the lineId', () => {
    // Regression guard: without the cascade, a re-add of a lineId
    // would rehydrate stale per-unit state via any obligation the
    // caller forgot to pass in lineLeafObligations. Belt-and-braces
    // given the line counter is monotonic (see readNextLineId).
    const request = makeRequest()
    request.yar.set(SESSION_KEY, {
      [commodityCode.id]: { line1: '0102', line2: '0103' },
      [permanentAddress.id]: {
        'line1/unit1': { addressLine1: '10 High St' },
        'line1/unit2': { addressLine1: '20 Low St' },
        'line2/unit1': { addressLine1: '30 Other St' }
      },
      [passport.id]: {
        'line1/unit1': 'PP-001',
        'line2/unit1': 'PP-999'
      }
    })
    request.yar.set(NEXT_LINE_ID_KEY, 3)
    request.yar.set(NEXT_UNIT_ID_BY_LINE_KEY, { line1: 3, line2: 2 })

    deleteCommodityLine(request, 'line1', [commodityCode])

    const stored = readFulfilments(request)
    // line1's leaf on commodityCode is gone; line2 unaffected.
    expect(stored[commodityCode.id]).toEqual({ line2: '0103' })
    // Every line1/... unit key gone from BOTH unit-scoped obligations,
    // even though we only passed commodityCode in lineLeafObligations.
    expect(stored[permanentAddress.id]).toEqual({
      'line2/unit1': { addressLine1: '30 Other St' }
    })
    expect(stored[passport.id]).toEqual({ 'line2/unit1': 'PP-999' })
    // Per-line unit counter for line1 is dropped so a fresh line1
    // starts at unit1 again.
    expect(request.yar.get(NEXT_UNIT_ID_BY_LINE_KEY)).toEqual({ line2: 2 })
  })
})
