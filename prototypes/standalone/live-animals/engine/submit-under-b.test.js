import { beforeEach, describe, expect, it } from 'vitest'
import { commit, submitJourney } from './index.js'
import {
  records,
  configureRecords,
  IN_PROGRESS,
  SUBMITTED
} from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { stubH, journeyRequest } from './test-support.js'

// submitJourney reads its scope through `makeScope` (B-derived) and gates on
// that scope's `readyForCheckYourAnswers`. `records.finalise` is A's
// persistence (B has none). These tests confirm submit finalises the journey
// by its journeyId when CYA-ready and blocks when not.

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('submitJourney — B-derived scope gate, A finalise', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    journeyId = (await records.create()).journeyId
  })

  it('Should finalise the CYA-ready journey by its journeyId', async () => {
    configureReadyForCheckYourAnswers(() => true)
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })

    const result = await submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(true)
    expect(result.journey.journeyId).toBe(journeyId)
    expect(result.journey.status).toBe(SUBMITTED)
    expect((await records.load({ journeyId })).status).toBe(SUBMITTED)
  })

  it('Should return { ok: false } and leave the journey in-progress when not CYA-ready', async () => {
    configureReadyForCheckYourAnswers(() => false)
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })

    const result = await submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(false)
    expect((await records.load({ journeyId })).status).toBe(IN_PROGRESS)
  })
})
