import { beforeEach, describe, expect, it } from 'vitest'
import { appendEntryAt, removeEntryAt, updateEntryAt } from './index.js'
import { store } from './store.js'
import { JOURNEY_COOKIE } from './journey.js'
import * as driverClaim from '../features/named-driver/driver-claim.controller.js'

/**
 * The PATH-ADDRESSED store facade at depth (entry 6b). Drives the real
 * primitives through the real structuredClone store boundary — the round trip
 * `nested.test.js` cannot see (it tests reconcile in isolation). Pins the
 * append/remove/edit lifecycle for nested collections AND the malformed-index
 * hardening (a `.../foo/remove` URL must not `splice(NaN)` -> destroy instance 0).
 */
const stubH = () => ({
  view: (view, ctx) => ({ view, ctx }),
  redirect: (to) => ({ redirect: to }),
  state: () => {}
})

let journeyId
const req = () => ({
  payload: {},
  params: {},
  query: {},
  state: { [JOURNEY_COOKIE]: journeyId }
})
// Every seed keeps the named-driver add-on selected so the `drivers` collection
// stays IN SCOPE — otherwise `removeEntryAt`'s reconcile would (correctly) wipe
// the whole out-of-scope collection, masking the path-op behaviour under test.
const seed = (answers) =>
  store.saveAnswers(journeyId, { addons: ['named-driver'], ...answers })
const answersNow = () => store.get(journeyId).answers

describe('path-addressed store ops at depth', () => {
  beforeEach(() => {
    store.clear()
    journeyId = store.create().journeyId
  })

  it('appends a nested claim under a driver, minting the nested index', () => {
    seed({ drivers: [{ driverName: 'Sam' }] })
    const index = appendEntryAt(req(), stubH(), ['drivers', 0, 'claims'], {
      claimType: 'accident'
    })
    expect(index).toBe(0)
    expect(answersNow().drivers[0].claims).toEqual([{ claimType: 'accident' }])
    // Sibling driver untouched, input not aliased across the store boundary.
    const secondIndex = appendEntryAt(
      req(),
      stubH(),
      ['drivers', 0, 'claims'],
      {
        claimType: 'theft'
      }
    )
    expect(secondIndex).toBe(1)
    expect(answersNow().drivers[0].claims).toHaveLength(2)
  })

  it('removes a nested claim in place, leaving siblings intact', () => {
    seed({
      drivers: [{ claims: [{ claimType: 'a' }, { claimType: 'b' }] }]
    })
    removeEntryAt(req(), stubH(), ['drivers', 0, 'claims'], 0)
    expect(answersNow().drivers[0].claims).toEqual([{ claimType: 'b' }])
  })

  it('IGNORES a non-integer index (a malformed URL must not destroy instance 0)', () => {
    seed({ drivers: [{ driverName: 'FIRST' }, { driverName: 'SECOND' }] })
    removeEntryAt(req(), stubH(), ['drivers'], Number('foo')) // NaN
    expect(answersNow().drivers.map((d) => d.driverName)).toEqual([
      'FIRST',
      'SECOND'
    ])
  })

  it('IGNORES an out-of-range index on remove and update', () => {
    seed({ drivers: [{ driverName: 'only' }] })
    removeEntryAt(req(), stubH(), ['drivers'], 5)
    updateEntryAt(req(), stubH(), ['drivers'], 5, { driverName: 'ghost' })
    expect(answersNow().drivers).toEqual([{ driverName: 'only' }])
  })

  it('edits a nested entry in place (updateEntryAt — no longer dead code)', () => {
    seed({ drivers: [{ claims: [{ claimType: 'a' }] }] })
    updateEntryAt(req(), stubH(), ['drivers', 0, 'claims'], 0, {
      claimType: 'windscreen'
    })
    expect(answersNow().drivers[0].claims).toEqual([
      { claimType: 'windscreen' }
    ])
  })

  it('does not leak nested data after remove-then-add (no rehydrate at depth)', () => {
    seed({ drivers: [{ driverName: 'Sam', claims: [{ claimType: 'ghost' }] }] })
    removeEntryAt(req(), stubH(), ['drivers'], 0)
    appendEntryAt(req(), stubH(), ['drivers'], { driverName: 'Jo' })
    expect(JSON.stringify(answersNow())).not.toContain('ghost')
    expect(answersNow().drivers[0].claims).toBeUndefined()
  })

  it('a malformed/out-of-range driver index does not fabricate a phantom driver', () => {
    seed({ drivers: [{ driverName: 'Sam' }] })
    const postAddClaim = driverClaim.routes.find(
      (r) => r.method === 'POST' && r.path.endsWith('claims/add')
    ).handler
    const request = {
      payload: { claimType: 'accident', claimAmount: '100' },
      params: { driver: '99' },
      query: {},
      state: { [JOURNEY_COOKIE]: journeyId }
    }
    const res = postAddClaim(request, stubH())
    expect(res.redirect).toContain('addons/named-driver')
    // No sparse phantom driver fabricated at index 99.
    expect(answersNow().drivers).toHaveLength(1)
  })
})
