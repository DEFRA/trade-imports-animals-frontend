import { beforeEach, describe, expect, it, vi } from 'vitest'
import { commit, submitJourney } from './index.js'
import {
  records,
  configureRecords,
  DRAFT,
  SUBMITTED
} from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { authenticatedActor, stubH, journeyRequest } from './test-support.js'

// submitJourney reads its scope through `makeScope` and gates on that scope's
// `readyForCheckYourAnswers`. `records.finalise` is the persistence layer.
// These tests confirm submit finalises the journey by its journeyId when
// CYA-ready and blocks when not.

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('submitJourney — gates on scope readiness, finalises via records', () => {
  beforeEach(async () => {
    configureRecords('live-animals', recordsStub)
    configureSession('live-animals', sessionStub)
    await records.clear()
    journeyId = (await records.create()).journeyId
  })

  it('Should finalise the CYA-ready journey by its journeyId', async () => {
    const finalise = vi.fn(recordsStub.finalise)
    configureRecords('live-animals', { ...recordsStub, finalise })
    configureReadyForCheckYourAnswers(() => true)
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })

    const result = await submitJourney(buildRequest(), stubH())

    expect(finalise).toHaveBeenCalledWith(journeyId, authenticatedActor)
    expect(result.ok).toBe(true)
    expect(result.journey.journeyId).toBe(journeyId)
    expect(result.journey.status).toBe(SUBMITTED)
    expect((await records.load({ journeyId })).status).toBe(SUBMITTED)
  })

  it('Should return { ok: false } and leave the journey in draft when not CYA-ready', async () => {
    configureReadyForCheckYourAnswers(() => false)
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })

    const result = await submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(false)
    expect((await records.load({ journeyId })).status).toBe(DRAFT)
  })
})
