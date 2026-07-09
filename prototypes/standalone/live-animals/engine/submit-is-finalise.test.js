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

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('submit is finalise', () => {
  beforeEach(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    records.clear()
    journeyId = records.create().journeyId
  })

  it('Should flip to submitted, keep answers byte-equal, and freeze further writes', () => {
    configureReadyForCheckYourAnswers(() => true)
    commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })
    const committed = records.load({ journeyId }).answers

    const result = submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(true)
    expect(result.journey.status).toBe(SUBMITTED)
    expect(result.journey.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.journey.answers).toEqual(committed)
    expect(() => commit(buildRequest(), stubH(), { late: true })).toThrow(
      /is submitted — writes blocked/
    )
  })

  it('Should be a no-op when not ready — journey stays in-progress', () => {
    configureReadyForCheckYourAnswers(() => false)
    commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })

    const result = submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(false)
    expect(records.load({ journeyId }).status).toBe(IN_PROGRESS)
  })
})
