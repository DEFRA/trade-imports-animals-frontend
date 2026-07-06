import { beforeEach, describe, expect, it } from 'vitest'
import { currentJourney } from './journey.js'
import { records } from './persistence/records.js'
import { session, STUB_USER } from './persistence/session.js'

/**
 * NW-4 shape proof — JOURNEY <-> USER association through `journey.js`. A journey
 * minted through the facade carries the SESSION port's user on the durable
 * record; the `x-stub-user` header lets a test play a second user; and the two
 * users' active journeys are isolated in the `byUser` index. This is the
 * per-user recall the cookieless resume is built on.
 */
const makeH = () => ({ state: () => {}, unstate: () => {} })
const req = (headers = {}) => ({ state: {}, headers })

describe('journey-user association', () => {
  beforeEach(() => records.clear())

  it('stamps the session user on a journey minted through the facade', () => {
    const journey = currentJourney(req(), makeH())
    expect(records.load({ journeyId: journey.journeyId }).userId).toBe(
      STUB_USER
    )
  })

  it('honours the x-stub-user header so a test can be a second user', () => {
    expect(session.userId(req({ 'x-stub-user': 'user-B' }))).toBe('user-B')
    currentJourney(req({ 'x-stub-user': 'user-B' }), makeH())
    expect(records.load({ userId: 'user-B' })).toBeDefined()
  })

  it('keeps two users active journeys isolated in the byUser index', () => {
    const a = currentJourney(req(), makeH())
    const b = currentJourney(req({ 'x-stub-user': 'user-B' }), makeH())
    expect(a.journeyId).not.toBe(b.journeyId)
    expect(records.load({ userId: STUB_USER }).journeyId).toBe(a.journeyId)
    expect(records.load({ userId: 'user-B' }).journeyId).toBe(b.journeyId)
  })
})
