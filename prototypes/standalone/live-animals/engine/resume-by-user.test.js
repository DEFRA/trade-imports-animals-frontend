import { beforeEach, describe, expect, it } from 'vitest'
import { resume } from './index.js'
import { records } from './persistence/records.js'
import { STUB_USER, JOURNEY_COOKIE } from './persistence/session.js'
import { configureReadyForQuote } from './read.js'
import { recordingH } from './test-support.js'

describe('resume by user (cookieless)', () => {
  beforeEach(() => {
    records.clear()
    configureReadyForQuote(() => false)
  })

  it('Should recover a saved journey with no cookie, rebuild scope, and re-pin it', () => {
    const { journeyId } = records.create({ userId: STUB_USER })
    records.saveAnswers(journeyId, { email: 'a@b.com' })

    const h = recordingH()
    const result = resume({ state: {}, headers: {} }, h)

    expect(result.journey.journeyId).toBe(journeyId)
    expect(result.answers).toEqual({ email: 'a@b.com' })
    expect(result.scope.has('email')).toBe(true)
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
