import { beforeEach, describe, expect, it } from 'vitest'
import { resume } from './index.js'
import { records } from './persistence/records.js'
import { STUB_USER, JOURNEY_COOKIE } from './persistence/session.js'
import { configureReadyForQuote } from './read.js'
import { recordingH } from './test-support.js'

/**
 * NW-4 shape proof — COOKIELESS RESUME end-to-end through `state.resume`. A
 * journey saved in "session A" is recovered in a request carrying NO
 * JOURNEY_COOKIE, purely by the SESSION port's user identity. The port split's
 * payoff: load-by-user + reconcile, with the found journey re-pinned as active.
 * `readyForQuote` is stubbed so `makeScope` needs no boot dispatch index.
 */
describe('resume by user (cookieless)', () => {
  beforeEach(() => {
    records.clear()
    configureReadyForQuote(() => false)
  })

  it('Should recover a saved journey with no cookie, rebuild scope, and re-pin it', () => {
    // Session A: mint + save durable answers for the stub user.
    const { journeyId } = records.create({ userId: STUB_USER })
    records.saveAnswers(journeyId, { email: 'a@b.com' })

    // A brand-new request with NO JOURNEY_COOKIE.
    const h = recordingH()
    const result = resume({ state: {}, headers: {} }, h)

    // (i) the durable answers came back
    expect(result.journey.journeyId).toBe(journeyId)
    expect(result.answers).toEqual({ email: 'a@b.com' })
    // (ii) scope was rebuilt fresh by reconcile (email is a root obligation)
    expect(result.scope.has('email')).toBe(true)
    // (iii) the found journey was re-pinned as active
    expect(h.calls).toContainEqual([JOURNEY_COOKIE, journeyId])
  })

  it('Should mint a fresh journey when the user has none to resume', () => {
    const h = recordingH()
    const result = resume({ state: {}, headers: {} }, h)
    expect(result.journey.journeyId).toEqual(expect.any(String))
    expect(records.load({ userId: STUB_USER }).journeyId).toBe(
      result.journey.journeyId
    )
  })
})
