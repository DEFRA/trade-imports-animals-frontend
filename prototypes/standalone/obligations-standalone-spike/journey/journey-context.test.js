import { describe, expect, it } from 'vitest'
import { createJourneyRepository } from '../store/index.js'
import { BASE, FLOW_ID } from './config.js'
import {
  currentJourney,
  JOURNEY_COOKIE,
  journeyCookieOptions,
  registerJourneyCookie,
  startJourney
} from './journey-context.js'

/** A hand-rolled toolkit fake: the cookies it sets ARE the output. */
const fakeToolkit = () => {
  const cookies = {}
  return { cookies, h: { state: (name, value) => (cookies[name] = value) } }
}

const requestWith = (journeyId) => ({
  state: journeyId ? { [JOURNEY_COOKIE]: journeyId } : {}
})

describe('journey/journey-context — cookie definition', () => {
  it('scopes the cookie to BASE so spikes never share a journey', () => {
    expect(journeyCookieOptions.path).toBe(BASE)
    expect(journeyCookieOptions.clearInvalid).toBe(true)
  })

  it('registers the one cookie definition on the server', () => {
    const definitions = []
    registerJourneyCookie({
      state: (name, options) => definitions.push({ name, options })
    })
    expect(definitions).toEqual([
      { name: JOURNEY_COOKIE, options: journeyCookieOptions }
    ])
  })
})

describe('journey/journey-context — the isolation seam', () => {
  it('Start now always mints a fresh journey and re-points the cookie', () => {
    const repository = createJourneyRepository()
    const { cookies, h } = fakeToolkit()
    const first = startJourney(h, { repository })
    expect(first.flowId).toBe(FLOW_ID)
    expect(cookies[JOURNEY_COOKIE]).toBe(first.journeyId)
    const second = startJourney(h, { repository })
    expect(second.journeyId).not.toBe(first.journeyId)
    expect(cookies[JOURNEY_COOKIE]).toBe(second.journeyId)
  })

  it('resumes the cookie journey while it exists', () => {
    const repository = createJourneyRepository()
    const started = startJourney(fakeToolkit().h, { repository })
    repository.saveFulfilments(started.journeyId, { o1: { value: 'kept' } })
    const loaded = currentJourney(requestWith(started.journeyId), null, {
      repository
    })
    expect(loaded.journeyId).toBe(started.journeyId)
    expect(loaded.fulfilments).toEqual({ o1: { value: 'kept' } })
  })

  it('creates on a cookie-less request and sets the cookie', () => {
    const repository = createJourneyRepository()
    const { cookies, h } = fakeToolkit()
    const fresh = currentJourney(requestWith(null), h, { repository })
    expect(repository.has(fresh.journeyId)).toBe(true)
    expect(cookies[JOURNEY_COOKIE]).toBe(fresh.journeyId)
  })

  it('replaces a stale cookie instead of failing or defaulting', () => {
    const repository = createJourneyRepository()
    const { cookies, h } = fakeToolkit()
    const replaced = currentJourney(requestWith('gone-away'), h, {
      repository
    })
    expect(replaced.journeyId).not.toBe('gone-away')
    expect(repository.has(replaced.journeyId)).toBe(true)
    expect(cookies[JOURNEY_COOKIE]).toBe(replaced.journeyId)
  })

  it('never shares a journey between two cookie-less requests', () => {
    const repository = createJourneyRepository()
    const first = currentJourney(requestWith(null), fakeToolkit().h, {
      repository
    })
    const second = currentJourney(requestWith(null), fakeToolkit().h, {
      repository
    })
    expect(first.journeyId).not.toBe(second.journeyId)
  })
})
