import { beforeEach, describe, expect, it } from 'vitest'
import { currentJourney, JOURNEY_COOKIE } from './journey.js'
import { store } from './store.js'

/**
 * SAFETY-NET (NW-4 step 1) — pins journey isolation through the ONE public
 * entry point every read/write path funnels through: `currentJourney(req, h)`.
 * Mint / same-session-resume / stale-pointer-remint / parallel-cookie isolation
 * are the behaviours the two-port split must preserve byte-for-byte. Driven via
 * `currentJourney` (whose `(request, h)` signature is stable across the reshape)
 * rather than `startJourney` (whose signature gains `request`), so every
 * assertion here stays identical before and after the port split. `headers: {}`
 * on the stub request is forward-compat with the session port's `userId(req)`
 * and is ignored by today's model.
 */
const makeH = () => {
  const cookies = {}
  return {
    state: (name, value) => {
      cookies[name] = value
    },
    unstate: (name) => {
      delete cookies[name]
    },
    cookies
  }
}

const reqWith = (cookies) => ({ state: { ...cookies }, headers: {} })

describe('journey isolation seam', () => {
  beforeEach(() => store.clear())

  it('mints a fresh journey and pins it in the cookie when none is present', () => {
    const h = makeH()
    const journey = currentJourney(reqWith({}), h)
    expect(journey.journeyId).toEqual(expect.any(String))
    expect(journey.status).toBe('in-progress')
    expect(h.cookies[JOURNEY_COOKIE]).toBe(journey.journeyId)
  })

  it('resumes the same journey within a session (cookie points at a live journey)', () => {
    const first = currentJourney(reqWith({}), makeH())
    store.saveAnswers(first.journeyId, { email: 'a@b.com' })
    const again = currentJourney(
      reqWith({ [JOURNEY_COOKIE]: first.journeyId }),
      makeH()
    )
    expect(again.journeyId).toBe(first.journeyId)
    expect(again.answers).toEqual({ email: 'a@b.com' })
  })

  it('re-mints when the cookie points at a stale/unknown journey', () => {
    const h = makeH()
    const journey = currentJourney(
      reqWith({ [JOURNEY_COOKIE]: 'gone-1234' }),
      h
    )
    expect(journey.journeyId).not.toBe('gone-1234')
    expect(store.has(journey.journeyId)).toBe(true)
    expect(h.cookies[JOURNEY_COOKIE]).toBe(journey.journeyId)
  })

  it('keeps parallel cookies isolated — no cross-talk between two journeys', () => {
    const a = currentJourney(reqWith({}), makeH())
    const b = currentJourney(reqWith({}), makeH())
    expect(a.journeyId).not.toBe(b.journeyId)
    store.saveAnswers(a.journeyId, { who: 'A' })
    store.saveAnswers(b.journeyId, { who: 'B' })
    const aResumed = currentJourney(
      reqWith({ [JOURNEY_COOKIE]: a.journeyId }),
      makeH()
    )
    const bResumed = currentJourney(
      reqWith({ [JOURNEY_COOKIE]: b.journeyId }),
      makeH()
    )
    expect(aResumed.answers).toEqual({ who: 'A' })
    expect(bResumed.answers).toEqual({ who: 'B' })
  })
})
