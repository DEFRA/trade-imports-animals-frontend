import { beforeEach, describe, expect, it } from 'vitest'
import { currentJourney } from './journey.js'
import { records, configureRecords } from './persistence/records.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import {
  session,
  configureSession,
  STUB_USER,
  STUB_USER_HEADER
} from './persistence/session.js'
import { recordingH } from './test-support.js'

const buildRequest = (headers = {}) => ({ state: {}, headers })

describe('journey-user association', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
  })

  it('Should stamp the session user on a journey minted through the facade', async () => {
    const journey = await currentJourney(buildRequest(), recordingH())
    expect((await records.load({ journeyId: journey.journeyId })).userId).toBe(
      STUB_USER
    )
  })

  it('Should honour the x-stub-user header so a test can be a second user', async () => {
    expect(
      await session.userId(buildRequest({ [STUB_USER_HEADER]: 'user-B' }))
    ).toBe('user-B')
    const journey = await currentJourney(
      buildRequest({ [STUB_USER_HEADER]: 'user-B' }),
      recordingH()
    )
    expect((await records.load({ userId: 'user-B' })).journeyId).toBe(
      journey.journeyId
    )
  })

  it('Should keep two users active journeys isolated in the byUser index', async () => {
    const journeyA = await currentJourney(buildRequest(), recordingH())
    const journeyB = await currentJourney(
      buildRequest({ [STUB_USER_HEADER]: 'user-B' }),
      recordingH()
    )
    expect(journeyA.journeyId).not.toBe(journeyB.journeyId)
    expect((await records.load({ userId: STUB_USER })).journeyId).toBe(
      journeyA.journeyId
    )
    expect((await records.load({ userId: 'user-B' })).journeyId).toBe(
      journeyB.journeyId
    )
  })
})
