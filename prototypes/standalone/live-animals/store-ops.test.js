import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  appendEntryAt,
  commit,
  removeEntryAt,
  updateEntryAt
} from './engine/index.js'
import { store } from './engine/store.js'
import { records } from './engine/persistence/records.js'
import { configureReadyForQuote } from './engine/read.js'
import { stubH, journeyRequest } from './engine/test-support.js'
import { buildDispatch } from './flow/dispatch.js'
import { readyForQuote } from './flow/section-status.js'
import { dispatchPages } from './features/index.js'

/**
 * Depth-1 store-op coverage against the live `commodityLines` collection.
 *
 * This net was lost when inc-025 deleted the car `store-ops.test.js` along
 * with its depth-2 `drivers[i].claims[j]` carrier. The depth-2 mechanics have
 * no live carrier until M2 (see docs/limits.md), but the DEPTH-1 behaviour —
 * the `isValidIndex` guard on `updateEntryAt`/`removeEntryAt`, and
 * write-through-on-mutation where a `commit` re-runs `reconcile` and persists
 * — does have a live carrier now: `commodityLines`, whose `numberOfPackages`
 * is INCLUDES-gated on `commoditySelection`. The engine source is unchanged;
 * this only restores the test net against the live domain.
 */

let journeyId
const buildRequest = () => journeyRequest(journeyId)
const answersNow = () => store.get(journeyId).answers

// A valid commodity line. Cattle is on the package-count list, so a
// numberOfPackages on a Cattle line is in scope; Fish is off the list.
const line = (commoditySelection, extra = {}) => ({
  commoditySelection,
  typeSelection: 'domestic',
  speciesSelection: ['bos-taurus'],
  numberOfAnimalsQuantity: '25',
  ...extra
})

describe('path-addressed store ops at depth-1 (commodityLines — live carrier)', () => {
  // `commit` -> `makeScope` eagerly computes `readyForQuote`, which reads the
  // dispatch index — so replicate boot: build the index and inject the roll-up.
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
  })
  beforeEach(() => {
    store.clear()
    journeyId = store.create().journeyId
  })

  it('Should append a commodity line, minting the next index and persisting it', () => {
    const first = appendEntryAt(buildRequest(), stubH(), ['commodityLines'], {
      commoditySelection: '0102 - Cattle'
    })
    expect(first).toBe(0)
    const second = appendEntryAt(buildRequest(), stubH(), ['commodityLines'], {
      commoditySelection: '010420 - Goats'
    })
    expect(second).toBe(1)
    expect(answersNow().commodityLines).toEqual([
      { commoditySelection: '0102 - Cattle' },
      { commoditySelection: '010420 - Goats' }
    ])
  })

  it('Should edit a commodity line in place, leaving siblings intact', () => {
    store.saveAnswers(journeyId, {
      commodityLines: [line('0102 - Cattle'), line('010420 - Goats')]
    })
    updateEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      0,
      line('0101 - Horse')
    )
    expect(answersNow().commodityLines[0].commoditySelection).toBe(
      '0101 - Horse'
    )
    expect(answersNow().commodityLines[1].commoditySelection).toBe(
      '010420 - Goats'
    )
  })

  it('Should remove a commodity line in place, leaving siblings intact', () => {
    store.saveAnswers(journeyId, {
      commodityLines: [line('0102 - Cattle'), line('010420 - Goats')]
    })
    removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 0)
    expect(
      answersNow().commodityLines.map((entry) => entry.commoditySelection)
    ).toEqual(['010420 - Goats'])
  })

  it('Should ignore a non-integer index on remove (a malformed URL must not destroy instance 0)', () => {
    store.saveAnswers(journeyId, {
      commodityLines: [line('0102 - Cattle'), line('010420 - Goats')]
    })
    removeEntryAt(buildRequest(), stubH(), ['commodityLines'], Number('foo')) // NaN
    expect(
      answersNow().commodityLines.map((entry) => entry.commoditySelection)
    ).toEqual(['0102 - Cattle', '010420 - Goats'])
  })

  it('Should ignore an out-of-range index on remove', () => {
    store.saveAnswers(journeyId, { commodityLines: [line('0102 - Cattle')] })
    removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 5)
    expect(answersNow().commodityLines).toEqual([line('0102 - Cattle')])
  })

  it('Should ignore a non-integer index on update', () => {
    store.saveAnswers(journeyId, { commodityLines: [line('0102 - Cattle')] })
    updateEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      Number('foo'), // NaN
      line('0301 - Fish')
    )
    expect(answersNow().commodityLines).toEqual([line('0102 - Cattle')])
  })

  it('Should ignore an out-of-range index on update', () => {
    store.saveAnswers(journeyId, { commodityLines: [line('0102 - Cattle')] })
    updateEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      5,
      line('0301 - Fish')
    )
    expect(answersNow().commodityLines).toEqual([line('0102 - Cattle')])
  })

  it('Should write through a commit that mutates a line, re-running reconcile and destroying the now-out-of-scope package count at its exact path', () => {
    // A Cattle line carries a package count (Cattle is on the list, so it is in
    // scope). The commit mutates the line to Fish — off the list — while it
    // still carries the stale count. commit must re-run reconcile and DELETE
    // commodityLines[0].numberOfPackages (destroyed, not hidden), persisting the
    // result to the durable record.
    store.saveAnswers(journeyId, {
      commodityLines: [line('0102 - Cattle', { numberOfPackages: '5' })]
    })
    commit(buildRequest(), stubH(), {
      commodityLines: [line('0301 - Fish', { numberOfPackages: '5' })]
    })
    const persisted = records.load({ journeyId }).answers
    expect(persisted.commodityLines[0].commoditySelection).toBe('0301 - Fish')
    expect('numberOfPackages' in persisted.commodityLines[0]).toBe(false)
  })

  it('Should preserve an in-scope package count when a commit leaves the line on the list', () => {
    store.saveAnswers(journeyId, {
      commodityLines: [line('0102 - Cattle', { numberOfPackages: '5' })]
    })
    commit(buildRequest(), stubH(), {
      commodityLines: [line('0102 - Cattle', { numberOfPackages: '9' })]
    })
    expect(records.load({ journeyId }).answers.commodityLines[0]).toEqual(
      line('0102 - Cattle', { numberOfPackages: '9' })
    )
  })
})
