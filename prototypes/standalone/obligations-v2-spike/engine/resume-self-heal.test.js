import { beforeEach, describe, expect, it } from 'vitest'
import { resume } from './index.js'
import { records } from './persistence/records.js'
import { STUB_USER } from './persistence/session.js'
import { configureReadyForQuote } from './read.js'

/**
 * NW-4 shape proof (the definitive NOTHING-DERIVED-IS-STORED test) — a journey
 * is saved with an obligation that is now OUT of scope (claims data, but
 * `hadClaims: 'no'`). On a days-later `state.resume`, scope is recomputed from
 * the answers alone: the stale obligation is excluded and the in-scope one is
 * re-derived. The durable record carries ONLY answers — no scope/status/wipe
 * fields — so there is nothing derived to go stale in the first place.
 */
const makeH = () => ({ state: () => {}, unstate: () => {} })

describe('resume self-heal (nothing derived is stored)', () => {
  beforeEach(() => {
    records.clear()
    configureReadyForQuote(() => false)
  })

  it('re-derives scope on resume, excluding a now-out-of-scope obligation', () => {
    const { journeyId } = records.create({ userId: STUB_USER })
    records.saveAnswers(journeyId, {
      email: 'a@b.com',
      hadClaims: 'no',
      claims: [{ claimType: 'accident', claimAmount: '500' }]
    })

    const result = resume({ state: {}, headers: {} }, makeH())

    // The stale, now-out-of-scope obligation is NOT in the freshly derived scope.
    expect(result.scope.has('claims')).toBe(false)
    // The in-scope obligation is re-derived correctly.
    expect(result.scope.has('email')).toBe(true)
  })

  it('stores only the canonical record fields — nothing derived is persisted', () => {
    const { journeyId } = records.create({ userId: STUB_USER })
    records.saveAnswers(journeyId, { hadClaims: 'no', claims: [{ x: 1 }] })

    const result = resume({ state: {}, headers: {} }, makeH())

    expect(Object.keys(result.journey).sort()).toEqual([
      'answers',
      'journeyId',
      'status',
      'submittedAt',
      'userId'
    ])
  })
})
