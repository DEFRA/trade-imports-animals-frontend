import { beforeEach, describe, expect, it } from 'vitest'
import { currentJourney } from './journey.js'
import { records } from './persistence/records.js'
import { session, STUB_USER, STUB_USER_HEADER } from './persistence/session.js'
import { recordingH } from './test-support.js'

const buildRequest = (headers = {}) => ({ state: {}, headers })

describe('journey-user association', () => {
  beforeEach(() => records.clear())

  it('Should stamp the session user on a journey minted through the facade', () => {
    const journey = currentJourney(buildRequest(), recordingH())
    expect(records.load({ journeyId: journey.journeyId }).userId).toBe(
      STUB_USER
    )
  })

  it('Should honour the x-stub-user header so a test can be a second user', () => {
    expect(session.userId(buildRequest({ [STUB_USER_HEADER]: 'user-B' }))).toBe(
      'user-B'
    )
    const journey = currentJourney(
      buildRequest({ [STUB_USER_HEADER]: 'user-B' }),
      recordingH()
    )
    expect(records.load({ userId: 'user-B' }).journeyId).toBe(journey.journeyId)
  })

  it('Should keep two users active journeys isolated in the byUser index', () => {
    const journeyA = currentJourney(buildRequest(), recordingH())
    const journeyB = currentJourney(
      buildRequest({ [STUB_USER_HEADER]: 'user-B' }),
      recordingH()
    )
    expect(journeyA.journeyId).not.toBe(journeyB.journeyId)
    expect(records.load({ userId: STUB_USER }).journeyId).toBe(
      journeyA.journeyId
    )
    expect(records.load({ userId: 'user-B' }).journeyId).toBe(
      journeyB.journeyId
    )
  })
})
