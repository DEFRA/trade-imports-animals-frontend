import { SET_ID } from '../../../../test/fixtures/index.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { commit, submitJourney, DRAFT, SUBMITTED } from './index.js'
import { records, configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { authenticatedActor, stubH, journeyRequest } from './test-support.js'

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('submitJourney — gates on scope readiness, submits via records', () => {
  beforeEach(async () => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    await records.clear()
    journeyId = (await records.create()).journeyId
  })

  it('Should submit the CYA-ready journey', async () => {
    const submit = vi.fn(recordsStub.submit)
    configureRecords(SET_ID, { ...recordsStub, submit })
    configureReadyForCheckYourAnswers(SET_ID, () => true)
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })

    const { concurrencyToken } = await records.load({ journeyId })

    const result = await submitJourney(buildRequest(), stubH(), {
      concurrencyToken
    })

    expect(submit).toHaveBeenCalledWith(
      journeyId,
      authenticatedActor,
      concurrencyToken
    )
    expect(result.ok).toBe(true)
    expect(result.journey.journeyId).toBe(journeyId)
    expect(result.journey.status).toBe(SUBMITTED)
    expect((await records.load({ journeyId })).status).toBe(SUBMITTED)
  })

  it('Should refuse to submit at a token the journey has moved on from', async () => {
    configureReadyForCheckYourAnswers(SET_ID, () => true)
    const { concurrencyToken: reviewed } = await records.load({ journeyId })
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })

    await expect(
      submitJourney(buildRequest(), stubH(), { concurrencyToken: reviewed })
    ).rejects.toMatchObject({ code: 'STALE_CONCURRENCY_TOKEN', status: 409 })
    expect((await records.load({ journeyId })).status).toBe(DRAFT)
  })

  it('Should return { ok: false } and leave the journey in draft when not CYA-ready', async () => {
    configureReadyForCheckYourAnswers(SET_ID, () => false)
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })
    const { concurrencyToken } = await records.load({ journeyId })

    const result = await submitJourney(buildRequest(), stubH(), {
      concurrencyToken
    })

    expect(result.ok).toBe(false)
    expect((await records.load({ journeyId })).status).toBe(DRAFT)
  })

  it('Should refuse to submit without the reviewed concurrency token', async () => {
    configureReadyForCheckYourAnswers(SET_ID, () => true)
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })

    await expect(submitJourney(buildRequest(), stubH(), {})).rejects.toThrow(
      /requires the reviewed concurrencyToken/
    )
    expect((await records.load({ journeyId })).status).toBe(DRAFT)
  })
})
