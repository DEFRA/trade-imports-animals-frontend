import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  appendEntryAt,
  commit,
  removeEntryAt,
  updateEntryAt
} from './engine/index.js'
import { store } from './engine/store.js'
import { configureReadyForQuote } from './engine/read.js'
import {
  stubH,
  journeyRequest,
  seedNamedDriver,
  postHandlerEndingWith
} from './engine/test-support.js'
import { buildDispatch } from './flow/dispatch.js'
import { readyForQuote } from './flow/section-status.js'
import { dispatchPages } from './features/index.js'
import * as driverClaim from './features/named-driver/driver-claim.controller.js'

let journeyId
const buildRequest = () => journeyRequest(journeyId)
const seed = (answers) => seedNamedDriver(store, journeyId, answers)
const answersNow = () => store.get(journeyId).answers

describe('path-addressed store ops at depth', () => {
  // `commit` -> `makeScope` eagerly computes `readyForQuote`, so replicate boot:
  // build the dispatch index and inject the roll-up (fail-loud if unconfigured).
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
  })
  beforeEach(() => {
    store.clear()
    journeyId = store.create().journeyId
  })

  it('Should append a nested claim under a driver, minting the nested index', () => {
    seed({ drivers: [{ driverName: 'Sam' }] })
    const index = appendEntryAt(
      buildRequest(),
      stubH(),
      ['drivers', 0, 'claims'],
      {
        claimType: 'accident'
      }
    )
    expect(index).toBe(0)
    expect(answersNow().drivers[0].claims).toEqual([{ claimType: 'accident' }])
    const secondIndex = appendEntryAt(
      buildRequest(),
      stubH(),
      ['drivers', 0, 'claims'],
      {
        claimType: 'theft'
      }
    )
    expect(secondIndex).toBe(1)
    expect(answersNow().drivers[0].claims).toHaveLength(2)
  })

  it('Should remove a nested claim in place, leaving siblings intact', () => {
    seed({
      drivers: [{ claims: [{ claimType: 'a' }, { claimType: 'b' }] }]
    })
    removeEntryAt(buildRequest(), stubH(), ['drivers', 0, 'claims'], 0)
    expect(answersNow().drivers[0].claims).toEqual([{ claimType: 'b' }])
  })

  it('Should ignore a non-integer index (a malformed URL must not destroy instance 0)', () => {
    seed({ drivers: [{ driverName: 'FIRST' }, { driverName: 'SECOND' }] })
    removeEntryAt(buildRequest(), stubH(), ['drivers'], Number('foo')) // NaN
    expect(answersNow().drivers.map((driver) => driver.driverName)).toEqual([
      'FIRST',
      'SECOND'
    ])
  })

  it('Should ignore an out-of-range index on remove', () => {
    seed({ drivers: [{ driverName: 'only' }] })
    removeEntryAt(buildRequest(), stubH(), ['drivers'], 5)
    expect(answersNow().drivers).toEqual([{ driverName: 'only' }])
  })

  it('Should ignore an out-of-range index on update', () => {
    seed({ drivers: [{ driverName: 'only' }] })
    updateEntryAt(buildRequest(), stubH(), ['drivers'], 5, {
      driverName: 'ghost'
    })
    expect(answersNow().drivers).toEqual([{ driverName: 'only' }])
  })

  it('Should edit a nested entry in place (updateEntryAt — no longer dead code)', () => {
    seed({ drivers: [{ claims: [{ claimType: 'a' }] }] })
    updateEntryAt(buildRequest(), stubH(), ['drivers', 0, 'claims'], 0, {
      claimType: 'windscreen'
    })
    expect(answersNow().drivers[0].claims).toEqual([
      { claimType: 'windscreen' }
    ])
  })

  it('Should not leak nested data after remove-then-add (no rehydrate at depth)', () => {
    seed({ drivers: [{ driverName: 'Sam', claims: [{ claimType: 'ghost' }] }] })
    removeEntryAt(buildRequest(), stubH(), ['drivers'], 0)
    appendEntryAt(buildRequest(), stubH(), ['drivers'], { driverName: 'Jo' })
    expect(JSON.stringify(answersNow())).not.toContain('ghost')
    expect(answersNow().drivers[0].claims).toBeUndefined()
  })

  it('Should destroy a windscreenProvider at its exact path on commit when a claim leaves windscreen', () => {
    // claim 0 stays windscreen; claim 1 is now accident but carries a stale
    // provider. A commit reconciles and must DELETE
    // drivers[0].claims[1].windscreenProvider (destroyed, not hidden) at that
    // exact path, leaving claim 0's provider.
    seed({
      drivers: [
        {
          driverName: 'Sam',
          relationship: 'spouse',
          claims: [
            { claimType: 'windscreen', windscreenProvider: 'autoglass' },
            { claimType: 'accident', windscreenProvider: 'stale' }
          ]
        }
      ]
    })
    commit(buildRequest(), stubH(), {})
    const now = answersNow()
    expect('windscreenProvider' in now.drivers[0].claims[1]).toBe(false)
    expect(now.drivers[0].claims[0].windscreenProvider).toBe('autoglass')
    expect(now.drivers[0].claims[1].claimType).toBe('accident')
  })

  it('Should not fabricate a phantom driver for a malformed/out-of-range driver index', () => {
    seed({ drivers: [{ driverName: 'Sam' }] })
    const postAddClaim = postHandlerEndingWith(driverClaim, 'claims/add')
    const request = journeyRequest(journeyId, {
      payload: { claimType: 'accident', claimAmount: '100' },
      params: { driver: '99' }
    })
    const response = postAddClaim(request, stubH())
    expect(response.redirect).toContain('addons/named-driver')
    expect(answersNow().drivers).toHaveLength(1)
  })
})
